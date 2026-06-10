import { processPostCallWithAws } from "./awsPostCall";

type KnowledgeUploadInput = {
  name?: string;
  folder?: string;
  text: string;
  metadata?: Record<string, unknown>;
};

type KnowledgeConfig = {
  origin: string;
  apiKey: string;
  partner: string;
  knowledgeBase: string;
  callsFolder: string;
};

export type NormalizedCallMemory = {
  title: string;
  transcript: string;
  metadata: Record<string, unknown>;
};

function getKnowledgeConfig(): KnowledgeConfig {
  const apiKey = process.env.HIDOBA_KNOWLEDGE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing HIDOBA_KNOWLEDGE_API_KEY environment variable.");
  }

  return {
    origin: (process.env.HIDOBA_KNOWLEDGE_API_ORIGIN || "https://knowledge.hidoba.com").replace(/\/$/, ""),
    apiKey,
    partner: process.env.HIDOBA_KNOWLEDGE_PARTNER || "godfather",
    knowledgeBase: process.env.HIDOBA_KNOWLEDGE_BASE || "OYA",
    callsFolder: process.env.HIDOBA_KNOWLEDGE_CALLS_FOLDER || "calls",
  };
}

function safeDateSlug(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[:.]/g, "-");
}

function safeFilename(name: string) {
  return name.replace(/[^\w.\- ]+/g, "-").replace(/\s+/g, "-").slice(0, 120);
}

function pickText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatTranscriptArray(items: unknown[]) {
  return items
    .map((item, index) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return "";

      const record = item as Record<string, unknown>;
      const speaker =
        pickText(record.speaker) ||
        pickText(record.name) ||
        pickText(record.role) ||
        pickText(record.originator) ||
        pickText(record.author) ||
        `Speaker ${index + 1}`;
      const text =
        pickText(record.text) ||
        pickText(record.content) ||
        pickText(record.message) ||
        pickText(record.transcript) ||
        pickText(record.value);
      const timestamp = pickText(record.timestamp) || pickText(record.time) || pickText(record.created_at);

      if (!text.trim()) return "";
      return `${timestamp ? `[${timestamp}] ` : ""}${speaker}: ${text.trim()}`;
    })
    .filter(Boolean)
    .join("\n");
}

function findTranscript(payload: unknown): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return formatTranscriptArray(payload);
  if (typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const directKeys = [
    "transcript",
    "transcription",
    "conversation",
    "history",
    "messages",
    "turns",
    "dialog",
    "utterances",
  ];

  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value)) {
      const text = formatTranscriptArray(value);
      if (text.trim()) return text;
    }
  }

  for (const key of ["call", "data", "result", "payload", "session"]) {
    const nested = findTranscript(record[key]);
    if (nested.trim()) return nested;
  }

  return "";
}

function compactPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return payload;

  const record = payload as Record<string, unknown>;
  const compactKeys = [
    "id",
    "call_id",
    "session_id",
    "bot_id",
    "meeting_url",
    "status",
    "started_at",
    "ended_at",
    "duration",
    "duration_seconds",
    "source",
  ];

  return Object.fromEntries(compactKeys.filter((key) => key in record).map((key) => [key, record[key]]));
}

export function normalizeCallMemory(payload: unknown): NormalizedCallMemory {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const transcript = findTranscript(payload).trim();
  const title =
    pickText(record.title) ||
    pickText(record.name) ||
    pickText(record.call_title) ||
    `OYA Call ${new Date().toISOString()}`;

  return {
    title,
    transcript,
    metadata: {
      received_at: new Date().toISOString(),
      source: pickText(record.source) || "oya-call-memory",
      compact_payload: compactPayload(payload),
    },
  };
}

function buildCallMarkdown(memory: NormalizedCallMemory) {
  return [
    `# ${memory.title}`,
    "",
    "## Metadata",
    "",
    "```json",
    JSON.stringify(memory.metadata, null, 2),
    "```",
    "",
    "## Transcript",
    "",
    memory.transcript,
    "",
  ].join("\n");
}

function pickCallId(memory: NormalizedCallMemory) {
  const compactPayload = memory.metadata.compact_payload;
  if (compactPayload && typeof compactPayload === "object") {
    const record = compactPayload as Record<string, unknown>;
    const candidate = record.call_id || record.id || record.session_id || record.bot_id;
    if (candidate) return String(candidate);
  }

  return memory.title;
}

async function hidobaFetch(path: string, init: RequestInit = {}) {
  const config = getKnowledgeConfig();
  const response = await fetch(`${config.origin}${path}`, {
    ...init,
    headers: {
      "X-API-Key": config.apiKey,
      ...(init.headers || {}),
    },
  });

  return response;
}

export async function ensureKnowledgeFolder(folder?: string) {
  const config = getKnowledgeConfig();
  const targetFolder = folder || config.callsFolder;

  const foldersResponse = await hidobaFetch(
    `/api/folders/${encodeURIComponent(config.partner)}/${encodeURIComponent(config.knowledgeBase)}`,
  );

  if (foldersResponse.ok) {
    const data = (await foldersResponse.json().catch(() => null)) as { folders?: string[] } | null;
    if (data?.folders?.some((existing) => existing.toLowerCase() === targetFolder.toLowerCase())) {
      return { ok: true, created: false, folder: targetFolder };
    }
  }

  const form = new FormData();
  form.append("name", targetFolder);

  const createResponse = await hidobaFetch(
    `/api/folders/${encodeURIComponent(config.partner)}/${encodeURIComponent(config.knowledgeBase)}`,
    {
      method: "POST",
      body: form,
    },
  );

  if (!createResponse.ok) {
    const details = await createResponse.text().catch(() => "");
    throw new Error(`Failed to ensure Hidoba Knowledge folder: ${createResponse.status} ${details}`);
  }

  return { ok: true, created: true, folder: targetFolder };
}

export async function uploadKnowledgeDocument(input: KnowledgeUploadInput) {
  const config = getKnowledgeConfig();
  const folder = input.folder || config.callsFolder;
  const name = input.name || `OYA Call ${new Date().toISOString()}`;
  const filename = `${safeFilename(name || "oya-call") || "oya-call"}-${safeDateSlug()}.md`;
  const text = input.metadata
    ? `${input.text}\n\n---\n\n## Upload Metadata\n\n\`\`\`json\n${JSON.stringify(input.metadata, null, 2)}\n\`\`\`\n`
    : input.text;

  await ensureKnowledgeFolder(folder);

  const form = new FormData();
  form.append("type", "file");
  form.append("folder", folder);
  form.append("name", name);
  form.append("auto_rewrite", "true");
  form.append("model_tier", "standard");
  form.append("use_original_as_rewritten", "true");
  form.append("expert_name", "OYA");
  form.append("file", new Blob([text], { type: "text/markdown;charset=utf-8" }), filename);

  const response = await hidobaFetch(
    `/api/documents/${encodeURIComponent(config.partner)}/${encodeURIComponent(config.knowledgeBase)}`,
    {
      method: "POST",
      body: form,
    },
  );

  const responseText = await response.text();
  let data: unknown = responseText;
  try {
    data = JSON.parse(responseText);
  } catch {
    // Keep raw text for debugging.
  }

  if (!response.ok) {
    throw new Error(`Hidoba Knowledge upload failed: ${response.status} ${responseText}`);
  }

  const documentId =
    data && typeof data === "object" && "id" in data ? String((data as { id?: unknown }).id || "") : "";
  let rewrittenUpload: unknown = null;

  if (documentId) {
    const rewrittenForm = new FormData();
    rewrittenForm.append("file", new Blob([text], { type: "text/markdown;charset=utf-8" }), filename);

    const rewrittenResponse = await hidobaFetch(
      `/api/documents/${encodeURIComponent(config.partner)}/${encodeURIComponent(
        config.knowledgeBase,
      )}/${encodeURIComponent(documentId)}/content/rewritten`,
      {
        method: "POST",
        body: rewrittenForm,
      },
    );

    const rewrittenText = await rewrittenResponse.text();
    try {
      rewrittenUpload = JSON.parse(rewrittenText);
    } catch {
      rewrittenUpload = rewrittenText;
    }

    if (!rewrittenResponse.ok) {
      throw new Error(`Hidoba Knowledge rewritten upload failed: ${rewrittenResponse.status} ${rewrittenText}`);
    }
  }

  return {
    ok: true,
    folder,
    filename,
    document: data,
    rewritten_upload: rewrittenUpload,
  };
}

export async function saveCallMemory(payload: unknown) {
  const memory = normalizeCallMemory(payload);

  if (!memory.transcript || memory.transcript.length < 8) {
    throw new Error("No usable transcript found in call payload.");
  }

  let awsPostCall: Awaited<ReturnType<typeof processPostCallWithAws>> | null = null;
  let awsError: string | null = null;

  try {
    awsPostCall = await processPostCallWithAws({
      callId: pickCallId(memory),
      title: memory.title,
      transcript: memory.transcript,
      metadata: memory.metadata,
    });
  } catch (error) {
    awsError = error instanceof Error ? error.message : "Unknown AWS post-call processing error.";
    console.error("[aws post-call] failed", error);
  }

  const markdown = [
    buildCallMarkdown({
      ...memory,
      metadata: {
        ...memory.metadata,
        aws_post_call: awsPostCall
          ? {
              prefix: awsPostCall.prefix,
              transcript: awsPostCall.transcriptUpload,
              summary: awsPostCall.summaryUpload,
              backup: awsPostCall.backupUpload,
              bedrock_mode: awsPostCall.analysis.mode,
              bedrock_model: awsPostCall.analysis.model,
            }
          : null,
        aws_post_call_error: awsError,
      },
    }),
    awsPostCall?.analysisMarkdown || "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return uploadKnowledgeDocument({
    name: memory.title,
    folder: getKnowledgeConfig().callsFolder,
    text: markdown,
    metadata: {
      ...memory.metadata,
      aws_post_call: awsPostCall
        ? {
            prefix: awsPostCall.prefix,
            transcript: awsPostCall.transcriptUpload,
            summary: awsPostCall.summaryUpload,
            backup: awsPostCall.backupUpload,
            bedrock: awsPostCall.analysis,
          }
        : null,
      aws_post_call_error: awsError,
    },
  });
}
