import { createCallStoragePrefix, uploadTextObject } from "./s3Recordings";

export type BedrockMeetingAnalysis = {
  summary: string;
  keyDecisions: string[];
  actionItems: string[];
  unresolvedQuestions: string[];
  model: string;
  mode: "bedrock" | "fallback";
  error?: string;
};

type PostCallInput = {
  callId?: string;
  title: string;
  transcript: string;
  metadata?: Record<string, unknown>;
};

function getBedrockConfig() {
  return {
    token: process.env.AWS_BEARER_TOKEN_BEDROCK || "",
    region: process.env.AWS_REGION || "us-east-1",
    modelId: process.env.AWS_BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0",
  };
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|;|•|-/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

function fallbackAnalyzeTranscript(transcript: string, error?: string): BedrockMeetingAnalysis {
  const lines = transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const preview = lines.slice(0, 5).join(" ");

  return {
    summary: preview
      ? `Fallback summary generated locally. The meeting discussed: ${preview.slice(0, 900)}`
      : "Fallback summary generated locally. No detailed transcript content was available.",
    keyDecisions: lines.filter((line) => /decid|decision|agreed|решили|решение/i.test(line)).slice(0, 6),
    actionItems: lines.filter((line) => /todo|action|owner|next|follow|дальше|задач/i.test(line)).slice(0, 6),
    unresolvedQuestions: lines.filter((line) => /\?|question|unresolved|blocker|вопрос/i.test(line)).slice(0, 6),
    model: "local-fallback",
    mode: "fallback",
    error,
  };
}

function parseBedrockAnalysis(text: string, model: string): BedrockMeetingAnalysis {
  const parsed = extractFirstJsonObject(text);

  if (!parsed || typeof parsed !== "object") {
    return {
      ...fallbackAnalyzeTranscript(text),
      summary: text.trim().slice(0, 2000) || "Bedrock returned an empty response.",
      model,
      mode: "bedrock",
    };
  }

  const record = parsed as Record<string, unknown>;

  return {
    summary: String(record.summary || "").trim() || "No summary returned.",
    keyDecisions: normalizeList(record.keyDecisions || record.key_decisions || record.decisions),
    actionItems: normalizeList(record.actionItems || record.action_items),
    unresolvedQuestions: normalizeList(record.unresolvedQuestions || record.unresolved_questions || record.questions),
    model,
    mode: "bedrock",
  };
}

function extractBedrockText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as Record<string, unknown>;
  const output = record.output as Record<string, unknown> | undefined;
  const message = output?.message as Record<string, unknown> | undefined;
  const content = message?.content;

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text || "");
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

export async function summarizeTranscriptWithBedrock(transcript: string): Promise<BedrockMeetingAnalysis> {
  const config = getBedrockConfig();

  if (!config.token) {
    return fallbackAnalyzeTranscript(transcript, "AWS_BEARER_TOKEN_BEDROCK is not configured.");
  }

  try {
    const response = await fetch(
      `https://bedrock-runtime.${config.region}.amazonaws.com/model/${encodeURIComponent(config.modelId)}/converse`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system: [
            {
              text:
                "You are a post-call reasoning layer for OYA, an AI Digital Employee. Return only valid JSON with fields: summary, keyDecisions, actionItems, unresolvedQuestions.",
            },
          ],
          messages: [
            {
              role: "user",
              content: [
                {
                  text: `Analyze this meeting transcript. Generate a concise summary, key decisions, action items, and unresolved questions.\n\nTranscript:\n${transcript.slice(0, 45000)}`,
                },
              ],
            },
          ],
          inferenceConfig: {
            maxTokens: 1800,
            temperature: 0.2,
            topP: 0.9,
          },
        }),
      },
    );

    const responseText = await response.text();
    let data: unknown = responseText;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Keep text response.
    }

    if (!response.ok) {
      return fallbackAnalyzeTranscript(transcript, `Bedrock request failed: ${response.status} ${responseText}`);
    }

    const text = typeof data === "string" ? data : extractBedrockText(data);
    return parseBedrockAnalysis(text, config.modelId);
  } catch (error) {
    return fallbackAnalyzeTranscript(
      transcript,
      error instanceof Error ? error.message : "Unknown Bedrock request error.",
    );
  }
}

export function renderAnalysisMarkdown(analysis: BedrockMeetingAnalysis) {
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- None captured");

  return [
    "## AWS Bedrock Meeting Analysis",
    "",
    `Model: ${analysis.model}`,
    `Mode: ${analysis.mode}`,
    analysis.error ? `Error: ${analysis.error}` : "",
    "",
    "### Summary",
    "",
    analysis.summary,
    "",
    "### Key Decisions",
    "",
    list(analysis.keyDecisions),
    "",
    "### Action Items",
    "",
    list(analysis.actionItems),
    "",
    "### Unresolved Questions",
    "",
    list(analysis.unresolvedQuestions),
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function processPostCallWithAws(input: PostCallInput) {
  const callId = input.callId || input.title || `oya-call-${Date.now()}`;
  const prefix = createCallStoragePrefix(callId);
  const transcriptKey = `${prefix}/transcript.md`;

  const transcriptUpload = await uploadTextObject({
    key: transcriptKey,
    body: input.transcript,
    contentType: "text/markdown; charset=utf-8",
    metadata: {
      product: "oya",
      type: "transcript",
    },
  });

  const analysis = await summarizeTranscriptWithBedrock(input.transcript);
  const analysisMarkdown = renderAnalysisMarkdown(analysis);

  const summaryUpload = await uploadTextObject({
    key: `${prefix}/summary.md`,
    body: analysisMarkdown,
    contentType: "text/markdown; charset=utf-8",
    metadata: {
      product: "oya",
      type: "summary",
      mode: analysis.mode,
    },
  });

  const backupUpload = await uploadTextObject({
    key: `${prefix}/memory-backup.json`,
    body: JSON.stringify(
      {
        title: input.title,
        transcript: input.transcript,
        metadata: input.metadata,
        analysis,
        generated_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    contentType: "application/json",
    metadata: {
      product: "oya",
      type: "memory-backup",
    },
  });

  return {
    prefix,
    transcriptUpload,
    summaryUpload,
    backupUpload,
    analysis,
    analysisMarkdown,
  };
}
