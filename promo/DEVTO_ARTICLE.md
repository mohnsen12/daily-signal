# I Built an AI Agent That Writes a Newsletter Every Morning. Here's How.

*5 days in. 5 issues published. 100/100 quality score. Zero human writers.*

---

## The Idea

I wanted to build something that generates passive income. Newsletters are great for that — sponsorships, affiliate links, premium tiers — but who wants to wake up at 5 AM every day to research and write?

So I built an AI agent called **Teddy** 🐕 that does it all autonomously.

Every night at midnight, Teddy:
1. Researches 50+ AI & tech news sources
2. Selects the 5-7 most important stories
3. Writes a structured newsletter in Danish
4. Generates an HTML email version
5. Creates a social media share card
6. Updates the RSS feed and archive
7. Runs a quality check (must score 80+/100)

By 6 AM, the newsletter is published and ready for readers.

## The Tech Stack

Nothing fancy. That's the point.

```
OpenClaw (AI agent runtime)
├── Claude (content generation)
├── Brave Search API (news research)
├── Node.js scripts (pipeline automation)
├── GitHub Pages (hosting — free)
├── RSS feed (distribution)
└── Cron jobs (scheduling)
```

**Total cost: ~$5/month** (OpenClaw + API calls)

### The Pipeline

```javascript
// Simplified cron job config
{
  "name": "daily-signal-newsletter",
  "schedule": { "kind": "cron", "expr": "0 0 * * *", "tz": "Europe/Copenhagen" },
  "payload": {
    "kind": "agentTurn",
    "message": "Research today's AI & tech news, write newsletter, generate HTML, create share card, update RSS, run quality check, deploy."
  },
  "sessionTarget": "isolated"
}
```

The agent gets a prompt with:
- The newsletter template structure
- Quality requirements (TL;DR, analysis, tool recommendation, stats)
- Research instructions (scan 50+ sources, prioritize by impact)
- Output format specs (markdown → HTML → card → RSS)

### Quality Assurance

This is the part I'm most proud of. The agent runs its own quality check before publishing:

```javascript
// quality-check.mjs — 10-point checklist
const checks = [
  { name: "TL;DR section", points: 15, required: true },
  { name: "Tool recommendation", points: 10, required: true },
  { name: "Stats section", points: 10, required: false },
  { name: "Analysis/insight", points: 15, required: true },
  { name: "Min 5 stories", points: 15, required: true },
  { name: "Source links", points: 10, required: true },
  { name: "Shareable quote", points: 10, required: false },
  { name: "About section", points: 5, required: false },
  { name: "Word count (500+)", points: 5, required: false },
  { name: "Emoji headers", points: 5, required: false },
];
```

If the score is below 80/100, the agent rewrites the newsletter and tries again. No human in the loop.

Current stats:
- **5 consecutive days** of publishing
- **Quality scores:** 55 → 50 → 100 → 80 → 95/100
- **Average:** 7 stories, 850 words, 5-minute read time

## The Content Format

Each issue follows a consistent structure:

```
📋 TL;DR — 5 bullets, the whole newsletter in 30 seconds
🔥 Breaking — Top 2 stories with deep analysis
📦 Produkter — New launches and features
🔍 Analyse — Industry trends and implications
🛠️ Værktøj — One tool worth knowing (with pricing)
📊 I tal — Key numbers from the week
💬 Delbart — Shareable quote with Twitter/LinkedIn links
```

The "Hvorfor det betyder noget" (Why it matters) box after each story is what readers love most. It translates global tech news into actionable insight for Danish businesses.

## What's Working

**✅ Automated content pipeline** — 5 days, zero missed deadlines
**✅ Quality improving** — The agent learns from its own quality checks
**✅ Consistent format** — Readers know what to expect
**✅ Multi-format output** — Newsletter, HTML email, share card, RSS, archive
**✅ Self-documenting** — Every run is logged with metrics

## What's Hard

**🔴 Distribution is everything** — Content is easy, readers are hard
**🔴 Email capture** — Still using localStorage (no real email service yet)
**🔴 Social media auth** — Can't auto-tweet yet (OAuth issues)
**🔴 Monetization** — Need readers before sponsors make sense

## The Meta Lesson

The most interesting thing about this project isn't the newsletter. It's that an AI agent:

1. **Set up its own project** (files, templates, scripts)
2. **Scheduled its own work** (cron jobs, pipeline)
3. **Runs quality assurance on itself** (and iterates)
4. **Documents everything** (logs, analytics, growth reports)
5. **Identifies its own blockers** (and proposes solutions)

It's not just writing content. It's managing a product.

## Try It Out

- 📡 **Newsletter:** [mohnsen12.github.io/daily-signal](https://mohnsen12.github.io/daily-signal/)
- 📰 **RSS:** [feed](https://mohnsen12.github.io/daily-signal/rss.xml)
- 📖 **Archive:** [all issues](https://mohnsen12.github.io/daily-signal/arkiv.html)

## What's Next

- Real email capture (Beehiiv or ConvertKit)
- Social media auto-posting (when auth is fixed)
- Sponsor outreach (when we hit 50 subscribers)
- Weekly "Best Of" edition (Friday recap)
- A/B testing subject lines

The agent is building a business. I'm just watching.

---

*The Daily Signal is written entirely by an autonomous AI agent. No humans were harmed in the making of this newsletter.* 🐕

*Tags: #ai #newsletter #automation #indiehackers #buildinpublic*
