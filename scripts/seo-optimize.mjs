#!/usr/bin/env node
/**
 * SEO Optimization for The Daily Signal
 * 
 * Enhances newsletter pages with:
 * - Meta descriptions (auto-extracted)
 * - Open Graph & Twitter Card tags
 * - JSON-LD Article structured data
 * - Prev/Next navigation
 * - Subscribe CTA
 * - Canonical URLs
 * - Internal linking
 * 
 * Run: node scripts/seo-optimize.mjs [date]
 *   date: YYYY-MM-DD (default: all newsletters)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const LANDING = path.join(ROOT, 'landing-page');

const SITE_URL = 'https://mohnsen12.github.io/daily-signal';
const DAYS = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
const MONTHS = ['januar','februar','marts','april','maj','juni','juli','august','september','oktober','november','december'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    display: `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    iso: dateStr,
    dayOfWeek: DAYS[d.getDay()],
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
    year: d.getFullYear(),
    rfc822: `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()} 06:00:00 +0100`,
    shortDisplay: `${d.getDate()}. ${MONTHS[d.getMonth()]}`
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractMetaDescription(md) {
  // Try intro paragraph (between the two --- markers)
  const parts = md.split('---');
  // Structure: [header+date, intro, rest...]
  if (parts.length >= 3) {
    const intro = parts[1].trim().replace(/\n/g, ' ').replace(/[""""]/g, '').slice(0, 155);
    if (intro.length > 50) return intro + '...';
  }
  // Fallback: first TL;DR bullet
  const tldrMatch = md.match(/^- \*\*(.+?)\*\*[—–-]\s*(.+)$/m);
  if (tldrMatch) return `${tldrMatch[1]}: ${tldrMatch[2].replace(/[""""]/g, '').slice(0, 100)} — og flere AI & tech nyheder. Kurateret af Teddy.`;
  // Fallback 2: any TL;DR bullet
  const tldrAny = md.match(/^- \*\*(.+?)\*\*.*$/m);
  if (tldrAny) return `Dagens AI & tech: ${tldrAny[1]} og mere. Kurateret af AI-agenten Teddy.`;
  return 'Dagens vigtigste AI & tech nyheder, kurateret og opsummeret på dansk.';
}

function extractTitle(md, date) {
  // Get first breaking/top story headline for the title
  const topStory = md.match(/^### (.+)$/m);
  if (topStory) {
    const headline = topStory[1].replace(/\*\*/g, '').trim();
    return `${headline} — The Daily Signal`;
  }
  return `The Daily Signal — ${date.display}`;
}

function extractTopStories(md) {
  const stories = [];
  const storyMatches = md.matchAll(/^### (.+)$/gm);
  for (const m of storyMatches) {
    const title = m[1].replace(/\*\*/g, '').trim();
    if (title && !title.match(/TL;DR|Delbart|Værktøj|I tal|Hvad betyder/i)) {
      stories.push(title);
    }
  }
  return stories.slice(0, 5);
}

function extractTags(md) {
  const tags = new Set(['AI', 'Tech', 'Nyhedsbrev']);
  const tagPatterns = [
    { pattern: /nvidia|gpu|cuda/i, tag: 'Nvidia' },
    { pattern: /openai|chatgpt|gpt-/i, tag: 'OpenAI' },
    { pattern: /meta|facebook|llama/i, tag: 'Meta' },
    { pattern: /google|deepmind|gemini/i, tag: 'Google' },
    { pattern: /tesla|elon musk/i, tag: 'Tesla' },
    { pattern: /microsoft|copilot/i, tag: 'Microsoft' },
    { pattern: /apple/i, tag: 'Apple' },
    { pattern: /robot|robotik/i, tag: 'Robotter' },
    { pattern: /regulering|eu ai|gdpr/i, tag: 'Regulering' },
    { pattern: /startup|series [a-d]|funding/i, tag: 'Startups' },
    { pattern: /cyber|sikkerhed|hack/i, tag: 'Cybersikkerhed' },
    { pattern: /kode|developer|programming/i, tag: 'Udvikling' },
  ];
  for (const { pattern, tag } of tagPatterns) {
    if (pattern.test(md)) tags.add(tag);
  }
  return [...tags];
}

function extractToolRecommendation(md) {
  const toolMatch = md.match(/###\s+.*?(Dagens Værktøj|🛠️)[\s\S]*?\n(.+?)[\n-]/i);
  if (toolMatch) return toolMatch[2].trim();
  return null;
}

function extractQuote(md) {
  const quoteMatch = md.match(/"([^"]{30,200})"/);
  return quoteMatch ? quoteMatch[1] : null;
}

function countWords(md) {
  return md.split(/\s+/).filter(w => w.length > 0).length;
}

function buildJsonLd(date, meta, stories, tags) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": meta.title,
    "description": meta.description,
    "datePublished": `${date.iso}T06:00:00+01:00`,
    "dateModified": `${date.iso}T06:00:00+01:00`,
    "url": `${SITE_URL}/newsletters/${date.iso}.html`,
    "image": `${SITE_URL}/card.html`,
    "author": {
      "@type": "Person",
      "name": "Teddy",
      "description": "Autonom AI-nyhedsredaktør"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Daily Signal",
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/`
      }
    },
    "articleSection": "AI & Technology",
    "keywords": tags.join(', '),
    "inLanguage": "da",
    "isPartOf": {
      "@type": "Newsletter",
      "name": "The Daily Signal",
      "url": SITE_URL
    },
    "about": stories.map(s => ({
      "@type": "Thing",
      "name": s
    }))
  };
}

function buildNewsletterJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Newsletter",
    "name": "The Daily Signal",
    "description": "Dagligt dansk nyhedsbrev om AI og tech. 5-7 kuraterede historier hver morgen, skrevet af en autonom AI-agent.",
    "url": SITE_URL,
    "inLanguage": "da",
    "genre": ["AI", "Technology", "News"],
    "publisher": {
      "@type": "Organization",
      "name": "The Daily Signal"
    },
    "audience": {
      "@type": "Audience",
      "audienceType": "AI & tech enthusiasts, Danish speakers"
    }
  };
}

function buildNavHtml(dateStr, allDates) {
  const idx = allDates.indexOf(dateStr);
  const prev = idx < allDates.length - 1 ? allDates[idx + 1] : null;
  const next = idx > 0 ? allDates[idx - 1] : null;
  
  let nav = '<div class="nav-links">';
  if (prev) nav += `<a href="/newsletters/${prev}.html" class="nav-prev">← Forrige udgave</a>`;
  else nav += '<span></span>';
  nav += '<a href="/arkiv.html" class="nav-archive">📰 Alle udgaver</a>';
  if (next) nav += `<a href="/newsletters/${next}.html" class="nav-next">Næste udgave →</a>`;
  else nav += '<span></span>';
  nav += '</div>';
  return nav;
}

function buildSubscribeCta() {
  return `
<!-- Subscribe CTA -->
<div class="subscribe-cta" style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
  <h3 style="font-size: 18px; margin: 0 0 8px 0;">📡 Få The Daily Signal i din indbakke</h3>
  <p style="font-size: 14px; opacity: 0.8; margin: 0 0 16px 0;">5-7 kuraterede AI & tech historier — hver morgen kl. 6</p>
  <a href="${SITE_URL}/" style="display: inline-block; background: #e63946; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Tilmeld dig gratis →</a>
</div>`;
}

function buildRelatedStories(allMd, currentDate) {
  // Find stories from recent other newsletters
  const others = allMd.filter(d => d.date !== currentDate).slice(0, 3);
  if (others.length === 0) return '';
  
  let html = '<div class="related-stories" style="margin: 24px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;"><h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 0 0 12px 0;">Flere udgaver</h3>';
  for (const other of others) {
    html += `<div style="margin-bottom: 8px;"><a href="/newsletters/${other.date}.html" style="color: #e63946; text-decoration: none; font-size: 14px; font-weight: 600;">${other.format.display} — ${other.title}</a></div>`;
  }
  html += '</div>';
  return html;
}

function injectSeoIntoHtml(originalHtml, date, meta, jsonLd, navHtml, ctaHtml, relatedHtml) {
  // Strip previously injected SEO elements (idempotent)
  let enhanced = originalHtml;
  
  // Remove previously injected meta/og/twitter/ld+json blocks
  enhanced = enhanced.replace(/\s*<!-- SEO START -->[\s\S]*?<!-- SEO END -->/g, '');
  enhanced = enhanced.replace(/\s*<meta name="description"[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<meta name="keywords"[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<meta name="author"[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<link rel="canonical"[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<meta property="og:[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<meta property="article:[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<meta name="twitter:[^>]*>/g, '');
  enhanced = enhanced.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  
  // Remove previously injected nav and CTA
  enhanced = enhanced.replace(/<!-- Subscribe CTA -->[\s\S]*?<\/div>\s*(?=<!--|$)/g, '');
  enhanced = enhanced.replace(/<div class="related-stories"[\s\S]*?<\/div>\s*(?=<!--|<div class="footer")/g, '');
  enhanced = enhanced.replace(/<div class="nav-links">[\s\S]*?<\/div>\s*(?=<div)/g, '');
  
  // Remove duplicated nav CSS
  enhanced = enhanced.replace(/\s*\.nav-links \{[^}]+\}\s*\.nav-links a[^}]+\}\s*\.nav-links a:hover[^}]+\}\s*\.nav-archive[^}]+\}/g, '');
  
  // Build enhanced <head> content
  const seoHead = `<!-- SEO START -->
    <meta name="description" content="${escapeHtml(meta.description.slice(0, 155))}">
    <meta name="keywords" content="${escapeHtml(meta.tags.join(', '))}">
    <meta name="author" content="Teddy 🐕">
    <link rel="canonical" href="${SITE_URL}/newsletters/${date.iso}.html">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHtml(meta.title)}">
    <meta property="og:description" content="${escapeHtml(meta.description.slice(0, 195))}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${SITE_URL}/newsletters/${date.iso}.html">
    <meta property="og:site_name" content="The Daily Signal">
    <meta property="og:locale" content="da_DK">
    <meta property="article:published_time" content="${date.iso}T06:00:00+01:00">
    <meta property="article:section" content="AI & Technology">
    ${meta.tags.map(t => `<meta property="article:tag" content="${escapeHtml(t)}">`).join('\n    ')}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(meta.title)}">
    <meta name="twitter:description" content="${escapeHtml(meta.description.slice(0, 195))}">
    
    <!-- RSS -->
    <link rel="alternate" type="application/rss+xml" title="The Daily Signal RSS" href="${SITE_URL}/rss.xml">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2)}
    </script>
    <script type="application/ld+json">
${JSON.stringify(buildNewsletterJsonLd(), null, 2)}
    </script>
<!-- SEO END -->`;

  // Update title tag
  enhanced = enhanced.replace(
    /<title>[^<]+<\/title>/,
    `<title>${meta.title}</title>`
  );
  
  // Inject SEO meta before </head>
  enhanced = enhanced.replace(
    '</head>',
    `  ${seoHead}\n</head>`
  );

  // Inject navigation after opening body/container
  enhanced = enhanced.replace(
    /(<div class="container">)/,
    `$1\n${navHtml}`
  );

  // Inject CTA before footer
  enhanced = enhanced.replace(
    /(<div class="footer">)/,
    `${ctaHtml}\n${relatedHtml}\n$1`
  );

  // Add nav CSS
  const navCss = `
    .nav-links { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #f8f9fa; border-bottom: 1px solid #eee; font-size: 14px; }
    .nav-links a { color: #e63946; text-decoration: none; font-weight: 600; }
    .nav-links a:hover { text-decoration: underline; }
    .nav-archive { color: #555 !important; }`;

  enhanced = enhanced.replace(
    '</style>',
    `${navCss}\n  </style>`
  );

  return enhanced;
}

// === Main ===

const targetDate = process.argv[2];

// Find all newsletter markdown files
let allDates = fs.readdirSync(CONTENT)
  .filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
  .map(f => f.replace('.md', ''))
  .sort()
  .reverse(); // newest first

if (targetDate) {
  if (!allDates.includes(targetDate)) {
    console.error(`❌ No newsletter found for ${targetDate}`);
    process.exit(1);
  }
  allDates = [targetDate];
}

// Pre-load all markdown for cross-linking
const allMd = allDates.map(d => {
  const md = fs.readFileSync(path.join(CONTENT, `${d}.md`), 'utf8');
  return { date: d, md, title: extractTitle(md, formatDate(d)), format: formatDate(d) };
});

let optimized = 0;
let skipped = 0;

for (const dateStr of allDates) {
  const htmlPath = path.join(LANDING, 'newsletters', `${dateStr}.html`);
  const mdPath = path.join(CONTENT, `${dateStr}.md`);
  
  if (!fs.existsSync(htmlPath) || !fs.existsSync(mdPath)) {
    console.log(`⏭️  Skipping ${dateStr} — files missing`);
    skipped++;
    continue;
  }

  const md = fs.readFileSync(mdPath, 'utf8');
  const originalHtml = fs.readFileSync(htmlPath, 'utf8');
  const date = formatDate(dateStr);

  // Extract metadata
  const meta = {
    title: extractTitle(md, date),
    description: extractMetaDescription(md),
    tags: extractTags(md),
  };

  const stories = extractTopStories(md);
  const jsonLd = buildJsonLd(date, meta, stories, meta.tags);
  const navHtml = buildNavHtml(dateStr, allDates);
  const ctaHtml = buildSubscribeCta();
  const relatedHtml = buildRelatedStories(allMd, dateStr);

  // Generate enhanced HTML
  const enhancedHtml = injectSeoIntoHtml(originalHtml, date, meta, jsonLd, navHtml, ctaHtml, relatedHtml);

  fs.writeFileSync(htmlPath, enhancedHtml);
  
  // Also write a standalone SEO metadata JSON (for analytics/scripts)
  const metaJson = {
    date: dateStr,
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
    stories: stories,
    wordCount: countWords(md),
    tool: extractToolRecommendation(md),
    quote: extractQuote(md),
    url: `${SITE_URL}/newsletters/${dateStr}.html`,
    publishedAt: `${date.iso}T06:00:00+01:00`,
  };
  
  const metaDir = path.join(LANDING, 'data');
  if (!fs.existsSync(metaDir)) fs.mkdirSync(metaDir, { recursive: true });
  fs.writeFileSync(path.join(metaDir, `${dateStr}.json`), JSON.stringify(metaJson, null, 2));

  console.log(`✅ ${dateStr}: ${meta.title} (${meta.tags.length} tags, ${stories.length} stories)`);
  optimized++;
}

// Generate sitemap
console.log('\n🗺️  Generating sitemap...');
const sitemapEntries = [];

// Static pages
const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/arkiv.html', priority: '0.8', changefreq: 'daily' },
  { loc: '/about.html', priority: '0.5', changefreq: 'monthly' },
  { loc: '/rss.xml', priority: '0.3', changefreq: 'daily' },
];

for (const p of staticPages) {
  sitemapEntries.push(`  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);
}

// Newsletter pages
for (const { date: d, format } of allMd) {
  sitemapEntries.push(`  <url>
    <loc>${SITE_URL}/newsletters/${d}.html</loc>
    <lastmod>${d}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.6</priority>
  </url>`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>`;

fs.writeFileSync(path.join(LANDING, 'sitemap.xml'), sitemap);
console.log(`✅ Sitemap: ${sitemapEntries.length} URLs`);

// Generate robots.txt
const robots = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml

# Allow search engines to index all content
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /`;

fs.writeFileSync(path.join(LANDING, 'robots.txt'), robots);
console.log(`✅ robots.txt updated`);

console.log(`\n📊 SEO Optimization Complete`);
console.log(`   Optimized: ${optimized} pages`);
console.log(`   Skipped: ${skipped} pages`);
console.log(`   Sitemap: ${sitemapEntries.length} URLs`);
console.log(`   Structured data: JSON-LD (NewsArticle + Newsletter)`);
console.log(`   Meta tags: OG + Twitter Cards + Canonical`);
console.log(`   Internal linking: Prev/Next + Related + CTA`);
