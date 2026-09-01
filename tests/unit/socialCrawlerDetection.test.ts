/**
 * Unit Tests for Social Crawler User-Agent Detection
 * Hard limit: <= 300 LOC.
 */

import { describe, it, expect } from 'vitest';
import { isSocialMediaCrawler } from '../../src/seo/socialCrawlerDetection.js';

describe('isSocialMediaCrawler', () => {
  it('recognizes Facebook/WhatsApp/Instagram link-preview crawler', () => {
    expect(isSocialMediaCrawler('facebookexternalhit/1.1')).toBe(true);
  });

  it('recognizes Twitter/X card crawler', () => {
    expect(isSocialMediaCrawler('Twitterbot/1.0')).toBe(true);
  });

  it('recognizes LinkedIn preview crawler', () => {
    expect(isSocialMediaCrawler('LinkedInBot/1.0 (compatible; Mozilla/5.0)')).toBe(true);
  });

  it('recognizes Slack unfurl crawler', () => {
    expect(isSocialMediaCrawler('Slackbot-LinkExpanding 1.0')).toBe(true);
  });

  it('recognizes Telegram, WhatsApp, and Discord preview crawlers', () => {
    expect(isSocialMediaCrawler('TelegramBot (like TwitterBot)')).toBe(true);
    expect(isSocialMediaCrawler('WhatsApp/2.23.20 A')).toBe(true);
    expect(isSocialMediaCrawler('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)')).toBe(true);
  });

  it('recognizes Googlebot and Bingbot for search indexing', () => {
    expect(isSocialMediaCrawler('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isSocialMediaCrawler('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
  });

  it('recognizes AI search crawlers and LLM agents', () => {
    expect(isSocialMediaCrawler('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)')).toBe(true);
    expect(isSocialMediaCrawler('OAI-SearchBot/1.0; +https://openai.com/searchbot')).toBe(true);
    expect(isSocialMediaCrawler('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); ChatGPT-User/1.0; +https://openai.com/bot')).toBe(true);
    expect(isSocialMediaCrawler('ClaudeBot/1.0; +https://www.anthropic.com/claudebot')).toBe(true);
    expect(isSocialMediaCrawler('Claude-Web/1.0; +https://www.anthropic.com/claudebot')).toBe(true);
    expect(isSocialMediaCrawler('PerplexityBot/1.0 (+https://www.perplexity.ai/perplexitybot)')).toBe(true);
    expect(isSocialMediaCrawler('Google-Extended')).toBe(true);
    expect(isSocialMediaCrawler('Applebot-Extended')).toBe(true);
    expect(isSocialMediaCrawler('Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)')).toBe(true);
    expect(isSocialMediaCrawler('Bytespider; spider-feedback@bytedance.com')).toBe(true);
    expect(isSocialMediaCrawler('cohere-ai')).toBe(true);
    expect(isSocialMediaCrawler('Diffbot/0.1; +http://www.diffbot.com')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSocialMediaCrawler('TWITTERBOT/1.0')).toBe(true);
    expect(isSocialMediaCrawler('facebookEXTERNALhit/1.1')).toBe(true);
  });

  it('returns false for ordinary browser user agents', () => {
    expect(
      isSocialMediaCrawler(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
    ).toBe(false);
  });

  it('returns false for null or undefined user agents', () => {
    expect(isSocialMediaCrawler(null)).toBe(false);
    expect(isSocialMediaCrawler(undefined)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isSocialMediaCrawler('')).toBe(false);
  });
});
