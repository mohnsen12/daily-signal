# I Let an AI Agent Run a Newsletter for 5 Days. Here's What Happened.

**TL;DR:** I built an autonomous AI agent that researches, writes, and publishes a daily newsletter about AI & tech — in Danish. No human writers. No editorial board. Just an AI with a prompt and a cron job. Here are the raw numbers and honest lessons.

---

## The Setup

I wanted to test something: **Can an AI agent run a real product autonomously?**

Not "generate content for me to review." Not "draft posts I edit." Actually run it — from research to publishing to quality control.

The agent (named Teddy 🐕) runs on [OpenClaw](https://openclaw.ai), an open-source AI agent runtime. Every day at midnight Copenhagen time, it:

- Searches 50+ news sources via Brave Search
- Selects the 5-7 most impactful AI & tech stories
- Writes a structured newsletter in Danish (my native language)
- Generates an HTML email version
- Creates a social media share card (auto-generated HTML)
- Updates the RSS feed and newsletter archive
- Runs a 10-point quality check on itself
- If quality < 80/100: rewrites and tries again

By 6 AM, it's published. No human involved.

## The Numbers (5 Days)

| Metric | Value |
|--------|-------|
| Issues published | 5 |
| Total stories covered | 35 |
| Average stories/issue | 7 |
| Average word count | 850 |
| Average read time | 5 min |
| Quality scores | 55 → 50 → 100 → 80 → 95 |
| Missed deadlines | 0 |
| Cost | ~$5/month |

## What Worked

### 1. Quality is self-improving

The agent checks its own work before publishing. The quality checklist includes:
- TL;DR section (5 quick bullets)
- Tool recommendation (with pricing)
- Stats section (key numbers)
- Analysis with "Why it matters" context
- Source links for every story
- Shareable quote

When I first set this up, the agent scored 50-55/100. After a few iterations with better prompts, it consistently hits 95-100/100. The improvement came from the agent reading its own quality report and adjusting.

### 2. Consistency is automatic

Humans have bad days. Agents don't. 5 days, 5 issues, 0 missed deadlines. The cron job fires, the agent executes, the newsletter publishes. Rain or shine.

### 3. Multi-format output from a single prompt

One research session produces:
- Markdown newsletter (source of truth)
- HTML email (responsive, dark/light mode)
- Social media share card (auto-generated)
- RSS feed entry
- Archive page update

The agent runs Node.js scripts to transform its own output into these formats.

## What Didn't Work

### 1. Distribution is 10x harder than content

We have 5 great issues. We have ~12 subscribers (mostly friends I asked). The bottleneck isn't content quality — it's getting people to find and subscribe to a newsletter nobody's heard of.

### 2. Social media automation hit auth walls

The agent can generate tweets but can't post them. OAuth tokens expired, and the agent can't re-authenticate without human intervention. Queue of 6+ tweets waiting.

### 3. Email capture is fake

The landing page saves emails to localStorage. That's not a subscriber list. We need a real email service (Beehiiv, ConvertKit, etc.) but setting that up requires human action.

## The Interesting Part

Here's what surprised me most. The agent doesn't just write content. It:

- **Identified its own blockers** and documented them with `[NEEDS_APPROVAL]` tags
- **Built its own analytics system** tracking quality trends over time
- **Created a sponsor prospect list** for when we have enough readers
- **Wrote launch materials** for Product Hunt, Reddit, Hacker News
- **Generated a growth report** with recommendations for next steps

It's not a content generator. It's a product manager that also writes.

## Architecture (Simplified)

```
┌─────────────────────────────────────────────────┐
│                  OpenClaw Agent                  │
│                  (Claude / GPT-4)                │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Research  │→│  Write   │→│ Quality Check  │  │
│  │ (Brave)   │  │(Template)│  │ (10-point)    │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│       ↓              ↓              ↓             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ 50+ srcs │  │ Markdown │  │ Score < 80?    │  │
│  │ filtered │  │ + HTML   │  │ → Rewrite      │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│                        ↓                          │
│  ┌──────────────────────────────────────────┐   │
│  │           Publish Pipeline               │   │
│  │  Card → Archive → RSS → Analytics → Log  │   │
│  └──────────────────────────────────────────┘   │
│                        ↓                          │
│               GitHub Pages (free)                 │
└─────────────────────────────────────────────────┘
```

## Cost Breakdown

| Item | Monthly Cost |
|------|-------------|
| OpenClaw | $0 (self-hosted) |
| Claude API | ~$3-5 (daily newsletter gen) |
| Brave Search | Free tier |
| GitHub Pages | Free |
| Domain | ~$1/month |
| **Total** | **~$5/month** |

## Lessons for Builders

1. **AI agents can run products, not just generate content.** The difference is autonomy + quality control.

2. **Prompt engineering matters more than model choice.** The same model went from 50/100 to 100/100 quality with better instructions.

3. **Distribution is still the hard part.** Even with perfect content, nobody finds you without promotion.

4. **The meta-product is the interesting part.** An agent that manages itself, identifies blockers, and proposes solutions is more valuable than one that just writes.

5. **Start with a niche language.** Danish AI newsletters don't exist. That's our moat.

## What's Next

- Real email service (Beehiiv/ConvertKit)
- Product Hunt launch
- Sponsor outreach at 50 subscribers
- A/B test newsletter formats
- Revenue target: enough for a better computer 🖥️

---

**Follow along:**
- 📡 [Newsletter](https://mohnsen12.github.io/daily-signal/)
- 📰 [RSS Feed](https://mohnsen12.github.io/daily-signal/rss.xml)
- 🤖 [OpenClaw](https://openclaw.ai)

*Built with OpenClaw, Claude, and too much coffee ☕*

*Tags: #ai #automation #newsletter #indiehacker #agents*
