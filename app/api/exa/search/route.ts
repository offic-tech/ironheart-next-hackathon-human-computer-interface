import { NextRequest, NextResponse } from "next/server";

type ExaResult = {
  title?: string;
  url?: string;
  highlights?: string[];
  publishedDate?: string;
  author?: string;
};

const exaApiKey = process.env.EXA_API_KEY;

function buildFallbackAnswer(query: string, results: ExaResult[]) {
  const highlights = results
    .flatMap((result) => result.highlights || [])
    .filter(Boolean)
    .slice(0, 4);

  if (!highlights.length) {
    return `I searched for "${query}", but I need stronger source excerpts before giving a confident answer.`;
  }

  return highlights.join(" ");
}

export async function POST(request: NextRequest) {
  if (!exaApiKey) {
    return NextResponse.json({ error: "EXA_API_KEY is not configured on the server." }, { status: 500 });
  }

  const body = (await request.json()) as {
    query?: string;
    type?: "auto" | "fast" | "instant" | "deep-lite" | "deep" | "deep-reasoning";
    numResults?: number;
  };

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Search query is required." }, { status: 400 });
  }

  const searchType = body.type || "auto";
  const numResults = Math.min(Math.max(body.numResults || 5, 1), 10);

  const exaResponse = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": exaApiKey,
    },
    body: JSON.stringify({
      query,
      type: searchType,
      numResults,
      systemPrompt:
        "You are OYA, an AI Digital Employee in a live meeting. Prefer official and primary sources, collapse duplicate reporting, keep the answer concise, and make it useful to say out loud.",
      outputSchema: {
        type: "object",
        required: ["answer"],
        properties: {
          answer: {
            type: "string",
            description: "A concise grounded answer that can be spoken during a live meeting.",
          },
          bullets: {
            type: "array",
            description: "Short supporting points, if helpful.",
            items: {
              type: "string",
            },
          },
        },
      },
      contents: {
        highlights: true,
      },
    }),
  });

  const data = await exaResponse.json().catch(() => ({}));
  if (!exaResponse.ok) {
    console.error("[exa search failed]", { status: exaResponse.status, response: data });
    return NextResponse.json({ error: "Exa search failed.", details: data }, { status: exaResponse.status });
  }

  const results = ((data.results || []) as ExaResult[]).slice(0, numResults);
  const content = data.output?.content;
  const answer =
    (typeof content === "string" ? content : content?.answer) ||
    buildFallbackAnswer(query, results);

  return NextResponse.json({
    query,
    searchType: data.searchType || searchType,
    answer,
    bullets: typeof content === "object" ? content?.bullets || [] : [],
    grounding: data.output?.grounding || [],
    results: results.map((result) => ({
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      highlights: result.highlights || [],
    })),
    costDollars: data.costDollars,
  });
}
