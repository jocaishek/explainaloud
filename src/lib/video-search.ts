import "server-only";

import { env } from "~/env";
import type { SourceRow } from "~/lib/ai/sources";
import {
  directLearningWebsite,
  looksLikeEnglishText,
} from "~/lib/link-quality";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export type CourseVideo = {
  title: string;
  url: string;
};

export type CourseResource = {
  label: string;
  why: string;
  url: string;
};

export type VideoDiscovery = {
  videos: CourseVideo[];
  searched: boolean;
};

export type ResourceDiscovery = {
  resources: CourseResource[];
  searched: boolean;
};

export type CourseEvidenceDiscovery = ResourceDiscovery & {
  sources: SourceRow[];
};

const SEARCH_WORDS = new Set([
  "about",
  "best",
  "course",
  "explained",
  "introduction",
  "learn",
  "lesson",
  "the",
  "this",
  "video",
  "what",
]);

const RESOURCE_SEARCH_WORDS = new Set([
  ...SEARCH_WORDS,
  "also",
  "cause",
  "course",
  "decisive",
  "immediate",
  "marked",
  "point",
  "significant",
  "student",
  "that",
  "their",
  "these",
  "this",
  "victory",
  "was",
  "were",
]);

function topicWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .map((word) => (word === "yr" || word === "yrs" ? "years" : word))
      .filter((word) => word.length >= 3 && !SEARCH_WORDS.has(word)),
  );
}

function titleMatchesTopic(title: string, topic: string) {
  const expected = topicWords(topic);
  if (expected.size === 0) return true;

  const actual = topicWords(title);
  const matches = [...expected].filter((word) => actual.has(word)).length;
  return matches >= Math.min(2, expected.size);
}

function directYouTubeUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://youtu.be/${id}` : null;
    }

    if (host !== "youtube.com" && host !== "m.youtube.com") return null;
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/").filter(Boolean)[1];
      return id ? `https://www.youtube.com/shorts/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * One explicit basic search finds and ranks direct videos for the whole
 * course. Search depth is never automatic, so this remains a one-credit call.
 */
export async function discoverCourseVideos(
  topic: string,
  queries: string[],
): Promise<VideoDiscovery> {
  if (!env.TAVILY_API_KEY || queries.length === 0) {
    return { videos: [], searched: false };
  }

  try {
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: [
          `Best English-language educational YouTube videos about "${topic}".`,
          `Cover these ideas: ${queries.join("; ")}.`,
          "Every video must be spoken in English and have an English title.",
          "Return direct video watch pages, not search, channel, or playlist pages.",
        ].join(" "),
        topic: "general",
        country: "united states",
        search_depth: "basic",
        auto_parameters: false,
        include_answer: false,
        include_raw_content: false,
        include_domains: ["youtube.com", "youtu.be"],
        max_results: 8,
      }),
    });

    if (!response.ok) {
      console.error(`Video search failed: Tavily ${response.status}`);
      return { videos: [], searched: true };
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: unknown;
        url?: unknown;
        content?: unknown;
        score?: unknown;
      }>;
    };
    const seen = new Set<string>();
    const videos: CourseVideo[] = [];

    for (const result of payload.results ?? []) {
      if (typeof result.url !== "string") continue;
      const url = directYouTubeUrl(result.url);
      if (!url || seen.has(url)) continue;
      const title =
        typeof result.title === "string" && result.title.trim()
          ? result.title.trim()
          : `${topic} explained`;
      const searchEvidence = `${title} ${
        typeof result.content === "string" ? result.content : ""
      }`;
      if (
        !looksLikeEnglishText(searchEvidence) ||
        !titleMatchesTopic(title, topic)
      ) {
        continue;
      }
      seen.add(url);
      videos.push({ title, url });
      if (videos.length === 5) break;
    }

    return { videos, searched: true };
  } catch (error) {
    console.error("Video search failed:", error);
    return { videos: [], searched: true };
  }
}

function conciseReason(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const sentence = value
    .trim()
    .replace(/[#*_`[\]]+/gu, "")
    .replace(/\s+/gu, " ")
    .split(/(?<=[.!?])\s+/u)[0]
    ?.trim();
  if (!sentence) return fallback;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}…` : sentence;
}

/**
 * One basic search grounds courses that have no uploads. The same results are
 * reused as the course's reading resources, so research does not add another
 * Tavily call or switch to advanced/deep search.
 */
export async function discoverCourseEvidence(
  topic: string,
): Promise<CourseEvidenceDiscovery> {
  if (!env.TAVILY_API_KEY) {
    return { sources: [], resources: [], searched: false };
  }

  try {
    const topicPhrase = topic.trim().slice(0, 160);
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: `"${topicPhrase}" official documentation educational overview`,
        topic: "general",
        country: "united states",
        search_depth: "basic",
        auto_parameters: false,
        include_answer: false,
        include_raw_content: false,
        exclude_domains: [
          "bing.com",
          "duckduckgo.com",
          "facebook.com",
          "google.com",
          "instagram.com",
          "reddit.com",
          "tiktok.com",
          "x.com",
          "youtube.com",
          "youtu.be",
        ],
        max_results: 8,
      }),
    });

    if (!response.ok) {
      console.error(`Course evidence search failed: Tavily ${response.status}`);
      return { sources: [], resources: [], searched: true };
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: unknown;
        url?: unknown;
        content?: unknown;
        score?: unknown;
      }>;
    };
    const seen = new Set<string>();
    const sources: SourceRow[] = [];
    const resources: CourseResource[] = [];

    for (const result of payload.results ?? []) {
      if (
        typeof result.url !== "string" ||
        typeof result.title !== "string" ||
        typeof result.content !== "string" ||
        (typeof result.score === "number" && result.score < 0.2)
      ) {
        continue;
      }

      const url = directLearningWebsite(result.url);
      const title = result.title.trim();
      const content = result.content
        .trim()
        .replace(/\s+/gu, " ")
        .slice(0, 1800);
      const evidence = `${title} ${content}`;
      if (
        !url ||
        !title ||
        content.length < 40 ||
        seen.has(url) ||
        !looksLikeEnglishText(evidence) ||
        !titleMatchesTopic(evidence, topicPhrase)
      ) {
        continue;
      }

      seen.add(url);
      sources.push({ filename: title, content, url });
      resources.push({
        label: title,
        why: conciseReason(content, `A direct source for ${topicPhrase}.`),
        url,
      });
      if (sources.length === 5) break;
    }

    return { sources, resources, searched: true };
  } catch (error) {
    console.error("Course evidence search failed:", error);
    return { sources: [], resources: [], searched: true };
  }
}

/**
 * A separate one-credit basic search resolves model-suggested reading topics
 * to real article/course pages. Search pages, homepages, social networks, and
 * video sites are rejected before anything reaches the UI.
 */
export async function discoverCourseResources(
  topic: string,
  concepts: string[],
): Promise<ResourceDiscovery> {
  if (!env.TAVILY_API_KEY || concepts.length === 0) {
    return { resources: [], searched: false };
  }

  try {
    const topicPhrase = topic
      .trim()
      .replace(/\b(?:yr|yrs)\b/giu, "years")
      .slice(0, 120);
    const topicTerms = topicWords(topicPhrase);
    const conceptKeywords = [
      ...new Set(
        concepts
          .slice(0, 2)
          .join(" ")
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, " ")
          .split(/\s+/)
          .map((word) => (word === "yr" || word === "yrs" ? "years" : word))
          .filter(
            (word) =>
              word.length >= 3 &&
              !RESOURCE_SEARCH_WORDS.has(word) &&
              !topicTerms.has(word),
          ),
      ),
    ].slice(0, 3);
    const query =
      `English educational websites ${topicPhrase} ${conceptKeywords.join(" ")}`.trim();
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        topic: "general",
        country: "united states",
        search_depth: "basic",
        auto_parameters: false,
        include_answer: false,
        include_raw_content: false,
        exclude_domains: [
          "bing.com",
          "dokumen.pub",
          "duckduckgo.com",
          "facebook.com",
          "google.com",
          "instagram.com",
          "reddit.com",
          "studocu.com",
          "study.com",
          "tiktok.com",
          "x.com",
          "youtube.com",
          "youtu.be",
        ],
        max_results: 8,
      }),
    });

    if (!response.ok) {
      console.error(`Resource search failed: Tavily ${response.status}`);
      return { resources: [], searched: true };
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: unknown;
        url?: unknown;
        content?: unknown;
        score?: unknown;
      }>;
    };
    const seen = new Set<string>();
    const resources: CourseResource[] = [];

    for (const result of payload.results ?? []) {
      if (
        typeof result.url !== "string" ||
        typeof result.title !== "string" ||
        (typeof result.score === "number" && result.score < 0.2)
      ) {
        continue;
      }
      const url = directLearningWebsite(result.url);
      const label = result.title.trim();
      const evidence = `${label} ${
        typeof result.content === "string" ? result.content : ""
      }`;
      if (
        !url ||
        !label ||
        seen.has(url) ||
        !looksLikeEnglishText(label) ||
        !titleMatchesTopic(evidence, topic)
      ) {
        continue;
      }

      seen.add(url);
      resources.push({
        label,
        why: conciseReason(
          result.content,
          `A direct resource for studying ${topic}.`,
        ),
        url,
      });
      if (resources.length === 4) break;
    }

    return { resources, searched: true };
  } catch (error) {
    console.error("Resource search failed:", error);
    return { resources: [], searched: true };
  }
}
