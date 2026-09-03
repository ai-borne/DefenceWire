#!/usr/bin/env node
/**
 * DefenceWire LLM Grounding Spec Synchronizer
 * Builds public/llms.txt and public/llms-full.txt from SSOT datasets
 * (43 Strategic Programs, 31+ Verified Suppliers, and active story clusters).
 * Hard limit: <= 300 LOC.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { generateLlmsTxt, generateLlmsFullTxt } from '../src/seo/llmsGenerator.js';

async function syncLlmsSpecs() {
  const newsPath = path.resolve(process.cwd(), 'public/data/news.json');
  const llmsTxtPath = path.resolve(process.cwd(), 'public/llms.txt');
  const llmsFullTxtPath = path.resolve(process.cwd(), 'public/llms-full.txt');

  let stories = [];
  try {
    const raw = await fs.readFile(newsPath, 'utf-8');
    const data = JSON.parse(raw);
    stories = Array.isArray(data.clusters) ? data.clusters : [];
  } catch {
    // No feed yet; generator falls back gracefully to static datasets
  }

  const llmsTxt = generateLlmsTxt({ stories });
  const llmsFullTxt = generateLlmsFullTxt({ stories });

  await fs.writeFile(llmsTxtPath, llmsTxt, 'utf-8');
  await fs.writeFile(llmsFullTxtPath, llmsFullTxt, 'utf-8');

  console.log(`[LLMS SYNC] Wrote standard spec to ${llmsTxtPath} (${llmsTxt.length} bytes)`);
  console.log(`[LLMS SYNC] Wrote full extended spec to ${llmsFullTxtPath} (${llmsFullTxt.length} bytes)`);
}

syncLlmsSpecs().catch((err) => {
  console.error('[LLMS SYNC ERROR]', err);
  process.exitCode = 1;
});
