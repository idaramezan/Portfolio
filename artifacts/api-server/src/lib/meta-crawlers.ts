// Official Meta crawler tokens are matched case-insensitively because HTTP
// User-Agent casing is not significant for this policy decision.
const blockedMetaCrawlerTokens = [
  "meta-externalagent",
  "meta-externalfetcher",
  "meta-webindexer",
] as const;

export function isBlockedMetaCrawler(userAgent = "") {
  const normalized = userAgent.toLowerCase();
  return blockedMetaCrawlerTokens.some((token) => normalized.includes(token));
}
