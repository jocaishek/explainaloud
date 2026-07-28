import "server-only";

import { env } from "~/env";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

export type CourseVideo = {
  title: string;
  url: string;
};

export type VideoDiscovery = {
  videos: CourseVideo[];
  searched: boolean;
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
          `Best educational YouTube videos about "${topic}".`,
          `Cover these ideas: ${queries.join("; ")}.`,
          "Return direct video watch pages, not search, channel, or playlist pages.",
        ].join(" "),
        topic: "general",
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
      results?: Array<{ title?: unknown; url?: unknown; score?: unknown }>;
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
      if (!titleMatchesTopic(title, topic)) continue;
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
