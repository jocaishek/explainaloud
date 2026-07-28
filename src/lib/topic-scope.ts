const BROAD_TOPICS = new Set([
  "ai",
  "animals",
  "art",
  "artificial intelligence",
  "automobiles",
  "biology",
  "business",
  "cars",
  "chemistry",
  "coding",
  "computers",
  "computer science",
  "cooking",
  "economics",
  "engineering",
  "finance",
  "food",
  "geography",
  "government",
  "health",
  "history",
  "law",
  "literature",
  "math",
  "mathematics",
  "medicine",
  "music",
  "nature",
  "philosophy",
  "physics",
  "plants",
  "politics",
  "programming",
  "psychology",
  "science",
  "space",
  "sports",
  "technology",
  "world history",
]);

const BROAD_TOPIC_PREFIXES = ["all about ", "basics of ", "introduction to "];

export const BROAD_TOPIC_MESSAGE =
  "This topic is too broad. Try narrowing it to one concept or question—for example, “how electric car batteries work” instead of “cars.”";

function normalizeTopic(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Blocks only clear umbrella subjects. A short topic is not automatically
 * broad: focused terms such as "thermodynamics" and "photosynthesis" remain
 * valid.
 */
export function isTopicTooBroad(value: string) {
  const normalized = normalizeTopic(value);
  if (BROAD_TOPICS.has(normalized)) return true;

  return BROAD_TOPIC_PREFIXES.some((prefix) => {
    if (!normalized.startsWith(prefix)) return false;
    return BROAD_TOPICS.has(normalized.slice(prefix.length));
  });
}
