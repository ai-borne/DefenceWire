import { handleStoryPrerenderRequest } from '../src/seo/storyPrerenderHandler.js';
import fs from 'node:fs';

const indexHtml = fs.readFileSync('index.html', 'utf-8');
const newsData = JSON.parse(fs.readFileSync('public/data/news.json', 'utf-8'));
const testCluster = newsData.clusters[0];

console.log('🤖 [VERIFICATION] Testing Story Cluster:', testCluster.id);
console.log('📰 [HEADLINE]:', testCluster.synthesizedHeadline);

const deps = {
  fetchOriginHtml: async () => ({ status: 200, headers: { 'content-type': 'text/html' }, body: indexHtml }),
  fetchNewsFeed: async () => newsData
};

const bots = [
  { name: 'GPTBot (OpenAI / ChatGPT)', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)' },
  { name: 'ClaudeBot (Anthropic / Claude)', ua: 'ClaudeBot/1.0; +https://www.anthropic.com/claudebot' },
  { name: 'PerplexityBot (Perplexity AI)', ua: 'PerplexityBot/1.0 (+https://www.perplexity.ai/perplexitybot)' },
  { name: 'Google-Extended (Gemini / AI Overviews)', ua: 'Google-Extended' },
  { name: 'Applebot-Extended (Apple Intelligence)', ua: 'Applebot-Extended' },
  { name: 'Regular Chrome (Human Visitor)', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' }
];

let allPassed = true;

for (const bot of bots) {
  const res = await handleStoryPrerenderRequest({ userAgent: bot.ua, url: 'https://www.defencewire.in/story/' + testCluster.id }, deps);
  const hasJsonLd = res.body.includes('application/ld+json') && res.body.includes('NewsArticle');
  const hasArticleBody = res.body.includes('<article class="dw-prerender-story"');
  const isCleanSpa = res.body.includes('<div id="app"></div>');
  const isBot = bot.name !== 'Regular Chrome (Human Visitor)';

  console.log(`\n--- ${bot.name} ---`);
  console.log(`  HTTP Status: ${res.status}`);
  console.log(`  JSON-LD NewsArticle injected: ${hasJsonLd}`);
  console.log(`  Semantic <article> prerendered: ${hasArticleBody}`);
  console.log(`  Plain SPA shell: ${isCleanSpa}`);

  if (isBot) {
    if (!hasJsonLd || !hasArticleBody || isCleanSpa) {
      console.error(`❌ FAILED for bot: ${bot.name}`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: Full semantic article & Schema.org JSON-LD served`);
    }
  } else {
    if (hasArticleBody || !isCleanSpa) {
      console.error(`❌ FAILED for human browser: received bot prerender instead of clean SPA`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: Clean SPA shell served for client-side JS hydration`);
    }
  }
}

if (!allPassed) {
  process.exit(1);
}
console.log('\n🎉 [SUCCESS] All simulated AI crawlers and human visitors verified successfully!');
