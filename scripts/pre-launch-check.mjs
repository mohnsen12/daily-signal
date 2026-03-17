#!/usr/bin/env node

/**
 * Pre-Launch Check for The Daily Signal Product Hunt Launch
 * Verifies everything is ready for launch day
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const checks = [];
let pass = 0;
let fail = 0;
let warn = 0;

function check(name, fn, critical = true) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      checks.push({ name, status: '✅', level: 'pass' });
      pass++;
    } else if (result === 'warn') {
      checks.push({ name, status: '⚠️', level: 'warn' });
      warn++;
    } else {
      checks.push({ name, status: '❌', level: critical ? 'fail' : 'warn', detail: result });
      if (critical) fail++; else warn++;
    }
  } catch (e) {
    checks.push({ name, status: '❌', level: critical ? 'fail' : 'warn', detail: e.message });
    if (critical) fail++; else warn++;
  }
}

// === LANDING PAGE ===
check('Landing page exists', () => {
  return fs.existsSync(path.join(ROOT, 'landing-page/index.html'));
});

check('Landing page has PH CTA', () => {
  const html = fs.readFileSync(path.join(ROOT, 'landing-page/index.html'), 'utf-8');
  return html.includes('Product Hunt') && html.includes('producthunt.com');
});

check('Landing page has signup form', () => {
  const html = fs.readFileSync(path.join(ROOT, 'landing-page/index.html'), 'utf-8');
  return html.includes('formspree.io') || html.includes('signup');
});

check('Thank you page exists', () => {
  return fs.existsSync(path.join(ROOT, 'landing-page/thank-you.html'));
});

check('Exit intent popup exists', () => {
  return fs.existsSync(path.join(ROOT, 'landing-page/exit-intent.js'));
});

check('Launch day JS exists', () => {
  return fs.existsSync(path.join(ROOT, 'landing-page/launch-day.js'));
});

check('Referral system exists', () => {
  return fs.existsSync(path.join(ROOT, 'landing-page/referral.js'));
});

// === CONTENT ===
check('Latest newsletter exists', () => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  return fs.existsSync(path.join(ROOT, `content/${today}.md`)) ||
         fs.existsSync(path.join(ROOT, `content/${yesterday}.md`));
});

check('RSS feed exists', () => {
  return fs.existsSync(path.join(ROOT, 'rss.xml'));
});

check('Sitemap exists', () => {
  return fs.existsSync(path.join(ROOT, 'sitemap.xml'));
});

// === PROMO MATERIALS ===
check('PH launch kit exists', () => {
  return fs.existsSync(path.join(ROOT, 'promo/PRODUCT_HUNT_KIT.md'));
});

check('Launch day runbook exists', () => {
  return fs.existsSync(path.join(ROOT, 'promo/LAUNCH_DAY_RUNBOOK.md'));
});

check('Launch day tweets exist', () => {
  return fs.existsSync(path.join(ROOT, 'promo/LAUNCH_DAY_TWEETS.md'));
});

check('Reddit posts ready', () => {
  return fs.existsSync(path.join(ROOT, 'promo/REDDIT_POSTS.md'));
});

check('HN post ready', () => {
  return fs.existsSync(path.join(ROOT, 'promo/HACKER_NEWS_POST.md'));
});

check('Upvote squad messages ready', () => {
  return fs.existsSync(path.join(ROOT, 'promo/UPVOTE_SQUAD.md'));
});

check('Launch checklist ready', () => {
  return fs.existsSync(path.join(ROOT, 'promo/LAUNCH_CHECKLIST_FINAL.md'));
});

check('Screenshots exist', () => {
  const screenshotsDir = path.join(ROOT, 'promo/screenshots');
  if (!fs.existsSync(screenshotsDir)) return 'No screenshots directory';
  const files = fs.readdirSync(screenshotsDir);
  return files.length >= 3 ? true : `Only ${files.length} screenshots (need 3+)`;
});

// === SCRIPTS ===
check('Auto-tweet script exists', () => {
  return fs.existsSync(path.join(ROOT, 'scripts/auto-tweet.mjs'));
});

check('Quality check script exists', () => {
  return fs.existsSync(path.join(ROOT, 'scripts/quality-check.mjs'));
});

check('Analytics script exists', () => {
  return fs.existsSync(path.join(ROOT, 'scripts/analytics.mjs'));
});

// === GITHUB ===
check('Git repo is clean', () => {
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf-8' });
    return status.trim() === '' ? true : 'warn';
  } catch {
    return 'warn';
  }
}, false);

// === REPORT ===
console.log('\n🚀 PRE-LAUNCH CHECK — The Daily Signal Product Hunt Launch\n');
console.log('━'.repeat(60));

for (const c of checks) {
  console.log(`${c.status} ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

console.log('━'.repeat(60));
console.log(`\n📊 Results: ${pass} pass | ${warn} warn | ${fail} fail\n`);

if (fail > 0) {
  console.log('❌ LAUNCH NOT READY — Fix the failures above!\n');
  process.exit(1);
} else if (warn > 0) {
  console.log('⚠️ LAUNCH READY WITH WARNINGS — Review the warnings above.\n');
  process.exit(0);
} else {
  console.log('✅ ALL SYSTEMS GO — Ready for launch! 🚀\n');
  process.exit(0);
}
