#!/usr/bin/env node
/**
 * Pre-publish quality check for The Daily Signal newsletter.
 * Validates that a newsletter meets quality standards before publishing.
 * Run: node scripts/quality-check.mjs [path-to-newsletter.md]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const filepath = process.argv[2] || path.join(ROOT, 'content', `${new Date().toISOString().split('T')[0]}.md`);

if (!fs.existsSync(filepath)) {
  console.error(`❌ File not found: ${filepath}`);
  process.exit(1);
}

const content = fs.readFileSync(filepath, 'utf-8');
const filename = path.basename(filepath);

let score = 0;
const checks = [];
const warnings = [];
const errors = [];

// --- Check 1: Has TL;DR section ---
if (content.match(/TL;DR|Hurtigt overblik/i)) {
  score += 15;
  checks.push('✅ TL;DR section present');
} else {
  errors.push('❌ Missing TL;DR section — readers expect quick summary at top');
}

// --- Check 2: Has tool recommendation ---
if (content.match(/Værktøj|Dagens Værktøj|Tool/i)) {
  score += 15;
  checks.push('✅ Tool recommendation included');
} else {
  warnings.push('⚠️ No tool recommendation — valuable for engagement');
}

// --- Check 3: Has stats/numbers section ---
if (content.match(/I tal|📊|numbers/i)) {
  score += 15;
  checks.push('✅ Stats section present');
} else {
  warnings.push('⚠️ No stats section — numbers make content more shareable');
}

// --- Check 4: Has analysis/opinion ---
if (content.match(/Hvorfor det betyder|Hvad betyder|Analyse|Indsigt/i)) {
  score += 15;
  checks.push('✅ Analysis/opinion section present');
} else {
  warnings.push('⚠️ No analysis section — opinion adds depth and value');
}

// --- Check 5: Minimum stories ---
const storyCount = (content.match(/^## [^#]/gm) || []).filter(s => 
  !s.match(/TL;DR|Hurtigt|Delbart|Signal|Værktøj|Dagens/i)
).length;
if (storyCount >= 5) {
  score += 10;
  checks.push(`✅ ${storyCount} stories (target: 5-7)`);
} else if (storyCount >= 3) {
  score += 5;
  warnings.push(`⚠️ Only ${storyCount} stories — aim for 5-7`);
} else {
  errors.push(`❌ Only ${storyCount} stories — need at least 5`);
}

// --- Check 6: All stories have links ---
const sections = content.split(/^## /m).slice(1);
const storiesWithoutLinks = sections.filter(s => {
  const title = s.split('\n')[0];
  if (title.match(/TL;DR|Hurtigt|Delbart|Signal|Værktøj|Dagens|I tal/i)) return false;
  return !s.includes('http');
}).map(s => s.split('\n')[0]);

if (storiesWithoutLinks.length === 0) {
  score += 10;
  checks.push('✅ All stories have source links');
} else {
  errors.push(`❌ Stories without links: ${storiesWithoutLinks.join(', ')}`);
}

// --- Check 7: Has shareable section ---
if (content.match(/Delbart|Del|Quote|Cit/i)) {
  score += 5;
  checks.push('✅ Shareable section present');
} else {
  warnings.push('⚠️ No shareable/quote section — add social sharing hook');
}

// --- Check 8: Has "about" section at bottom ---
if (content.match(/Dagligt|The Daily Signal.*nyhedsbrev|Hvad er/i)) {
  score += 5;
  checks.push('✅ About/CTA section present');
} else {
  warnings.push('⚠️ No about section — remind readers what this is');
}

// --- Check 9: Word count ---
const words = content.split(/\s+/).filter(w => w.length > 0).length;
if (words >= 600 && words <= 1200) {
  score += 5;
  checks.push(`✅ Word count: ${words} (target: 600-1200)`);
} else if (words < 600) {
  warnings.push(`⚠️ Word count: ${words} — a bit short, aim for 600-1200`);
} else {
  warnings.push(`⚠️ Word count: ${words} — getting long, keep it tight`);
}

// --- Check 10: Has emoji headers (visual structure) ---
const emojiHeaders = (content.match(/^## .+$/gm) || []).filter(h => /\p{Emoji}/u.test(h));
if (emojiHeaders.length >= 3) {
  score += 5;
  checks.push(`✅ ${emojiHeaders.length} emoji headers for visual scanning`);
} else {
  warnings.push('⚠️ Add emoji to section headers for better visual scanning');
}

// --- Output ---
console.log(`\n🔍 Quality Check: ${filename}`);
console.log(`${'─'.repeat(50)}`);
console.log(`📊 Score: ${score}/100\n`);

if (checks.length) {
  console.log('Passed:');
  checks.forEach(c => console.log(`  ${c}`));
  console.log('');
}
if (warnings.length) {
  console.log('Warnings:');
  warnings.forEach(w => console.log(`  ${w}`));
  console.log('');
}
if (errors.length) {
  console.log('Errors:');
  errors.forEach(e => console.log(`  ${e}`));
  console.log('');
}

// Overall verdict
if (errors.length === 0 && score >= 80) {
  console.log('✨ VERDICT: Ready to publish!\n');
  process.exit(0);
} else if (errors.length === 0) {
  console.log('👍 VERDICT: Publishable, but could be better.\n');
  process.exit(0);
} else {
  console.log('🛑 VERDICT: Fix errors before publishing.\n');
  process.exit(1);
}
