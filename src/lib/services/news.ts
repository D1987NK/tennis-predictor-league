// Tennis news, fetched live via the Claude API's web search tool and cached in
// the database so we don't call the API on every dashboard view.
//
// SERVER-ONLY: this file reads ANTHROPIC_API_KEY and must never be imported
// from a client component. It's only ever called from API routes / server
// components, where env vars are safe (Next.js never inlines server-only env
// vars into the client bundle unless prefixed with NEXT_PUBLIC_).

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const CACHE_ID = 1;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — auto-refresh, or admin-triggered via ?refresh=1
const ARTICLE_COUNT = 5;

export interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  published: string; // e.g. "2026-06-30" or "recent" — model's best estimate
}

export interface NewsResult {
  articles: NewsArticle[];
  fetchedAt: Date;
  stale: boolean; // true if this is cached data older than the TTL (fetch failed/skipped)
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const NEWS_SCHEMA = {
  type: "object",
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string", description: "One or two sentence summary." },
          source: { type: "string", description: "Publication name, e.g. ESPN, ATP Tour." },
          url: { type: "string" },
          published: { type: "string", description: "Date (YYYY-MM-DD) if known, else 'recent'." },
        },
        required: ["title", "summary", "source", "url", "published"],
        additionalProperties: false,
      },
    },
  },
  required: ["articles"],
  additionalProperties: false,
} as const;

/** Call Claude with the web search tool to get today's top tennis headlines. */
async function fetchNewsFromClaude(): Promise<NewsArticle[]> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    // Cheapest Claude model ($1/$5 per 1M tokens). Fine for this task — fetching
    // and formatting 5 headlines doesn't need Opus-level reasoning. Haiku 4.5
    // isn't in the model list for the newer web_search_20260209 (dynamic
    // filtering) tool, so we use the basic web_search_20250305 variant instead.
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content:
          // The model's training data doesn't tell it today's real date, so
          // "yesterday" is anchored explicitly rather than left to guesswork.
          `Today's date is ${new Date().toISOString().slice(0, 10)} (UTC). ` +
          `Search the web for the ${ARTICLE_COUNT} most significant tennis news stories ` +
          "published yesterday only (UTC or local time).\n" +
          "Focus on ATP, WTA, or Grand Slam news including results, injuries, rankings, and tournament updates.\n" +
          `Return exactly ${ARTICLE_COUNT} articles, each with a verified working source URL.`,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: NEWS_SCHEMA as unknown as Record<string, unknown> },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined the news request.");
  }

  // With server tools in play the response can contain multiple content
  // blocks (server_tool_use, web_search_tool_result, text); the structured
  // JSON is the final text block.
  const textBlocks = response.content.filter(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  const last = textBlocks[textBlocks.length - 1];
  if (!last) throw new Error("Claude returned no text content.");

  const parsed = JSON.parse(last.text) as { articles: NewsArticle[] };
  return parsed.articles.slice(0, ARTICLE_COUNT);
}

/**
 * Get tennis news, using the DB cache while it's under a day old. Regular
 * users never trigger a re-fetch — the cache only turns over automatically
 * once it's older than CACHE_TTL_MS (1 day). Admins can pass `force: true`
 * to bypass the cache and re-fetch immediately (see requireAdmin gate on the
 * API route — this function itself doesn't check roles).
 */
export async function getTennisNews(opts?: { force?: boolean }): Promise<NewsResult> {
  const cached = await prisma.newsCache.findUnique({ where: { id: CACHE_ID } });
  const isFresh = !opts?.force && cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS;

  if (isFresh) {
    return {
      articles: cached!.articles as unknown as NewsArticle[],
      fetchedAt: cached!.fetchedAt,
      stale: false,
    };
  }

  try {
    const articles = await fetchNewsFromClaude();
    const saved = await prisma.newsCache.upsert({
      where: { id: CACHE_ID },
      create: { id: CACHE_ID, articles: articles as unknown as object },
      update: { articles: articles as unknown as object, fetchedAt: new Date() },
    });
    return { articles, fetchedAt: saved.fetchedAt, stale: false };
  } catch (err) {
    // Fetch failed (no API key, rate limit, network) — fall back to whatever
    // is cached, even if stale, rather than showing an empty section.
    if (cached) {
      return {
        articles: cached.articles as unknown as NewsArticle[],
        fetchedAt: cached.fetchedAt,
        stale: true,
      };
    }
    throw err;
  }
}
