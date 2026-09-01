/**
 * Social Crawler User-Agent Detection for DefenceWire.in
 * Identifies bots that fetch a page's HTML without executing JavaScript
 * (link-preview unfurlers and search indexers), so the edge can prerender
 * story-specific meta tags for them while regular users get the plain SPA.
 * Hard limit: <= 300 LOC.
 */

const SOCIAL_CRAWLER_USER_AGENT_PATTERNS: readonly RegExp[] = [
  /facebookexternalhit/i,
  /Facebot/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /TelegramBot/i,
  /WhatsApp/i,
  /Discordbot/i,
  /Googlebot/i,
  /Applebot/i,
  /redditbot/i,
  /Pinterest/i,
  /SkypeUriPreview/i,
  /vkShare/i,
  /Bingbot/i,
  /GPTBot/i,
  /OAI-SearchBot/i,
  /ChatGPT-User/i,
  /ClaudeBot/i,
  /Claude-Web/i,
  /anthropic-ai/i,
  /PerplexityBot/i,
  /Google-Extended/i,
  /Applebot-Extended/i,
  /Amazonbot/i,
  /Bytespider/i,
  /cohere-ai/i,
  /Diffbot/i
];

export function isSocialMediaCrawler(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SOCIAL_CRAWLER_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
