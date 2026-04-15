#!/usr/bin/env npx tsx
/**
 * Priors Twitter/X Bot
 *
 * Posts trending priors and notable probability changes to Twitter/X.
 * Run on a daily cron schedule.
 *
 * Setup:
 *   1. Create a Twitter/X developer account: https://developer.twitter.com
 *   2. Create an app with OAuth 1.0a (read + write)
 *   3. Set environment variables (see below)
 *
 * Usage:
 *   TWITTER_API_KEY=... TWITTER_API_SECRET=... \
 *   TWITTER_ACCESS_TOKEN=... TWITTER_ACCESS_SECRET=... \
 *   npx tsx agents/twitter-bot.ts
 *
 * Environment:
 *   TWITTER_API_KEY        — Twitter app API key
 *   TWITTER_API_SECRET     — Twitter app API secret
 *   TWITTER_ACCESS_TOKEN   — User access token
 *   TWITTER_ACCESS_SECRET  — User access secret
 *   PRIORS_API_URL         — Priors API (default: https://priors-rho.vercel.app)
 *   DRY_RUN                — Set to "true" to print without posting
 */

import crypto from "crypto";

const PRIORS_API = process.env.PRIORS_API_URL ?? "https://priors-rho.vercel.app";
const DRY_RUN = process.env.DRY_RUN === "true";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY ?? "";
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET ?? "";
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN ?? "";
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET ?? "";

interface Prior {
  slug: string;
  claim: string;
  currentProbability: number;
  updateCount: number;
  category: string;
}

// ── Twitter OAuth 1.0a ────────────────────────────────────────

function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: "1.0",
  };

  const allParams = { ...params, ...oauthParams };
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");

  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(TWITTER_API_SECRET)}&${encodeURIComponent(TWITTER_ACCESS_SECRET)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  return (
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ")
  );
}

async function tweet(text: string): Promise<boolean> {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would tweet:\n${text}\n`);
    return true;
  }

  const url = "https://api.twitter.com/2/tweets";
  const authHeader = oauthSign("POST", url, {});

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Tweet failed (${res.status}):`, err);
      return false;
    }

    const data = await res.json();
    console.log(`Tweeted: ${data.data?.id}`);
    return true;
  } catch (err) {
    console.error("Tweet error:", err);
    return false;
  }
}

// ── Priors API ────────────────────────────────────────────────

async function getTrending(): Promise<Prior[]> {
  const res = await fetch(`${PRIORS_API}/api/trending`);
  const data = await res.json();
  return data.priors ?? [];
}

async function getRecentUpdates(slug: string) {
  const res = await fetch(`${PRIORS_API}/api/priors/${slug}/updates?limit=5`);
  const data = await res.json();
  return data.updates ?? [];
}

// ── Post generation ───────────────────────────────────────────

function formatTrendingPost(priors: Prior[]): string {
  const top5 = priors.slice(0, 5);
  const lines = top5.map((p) => {
    const pct = (p.currentProbability * 100).toFixed(0);
    const bar = pct.length === 1 ? " " + pct : pct;
    return `${bar}% ${p.claim}`;
  });

  return `Today's priors:\n\n${lines.join("\n")}\n\nhttps://priors-rho.vercel.app`;
}

function formatBigMovePost(
  prior: Prior,
  oldProb: number,
  newProb: number,
  evidence: string
): string {
  const oldPct = (oldProb * 100).toFixed(0);
  const newPct = (newProb * 100).toFixed(0);
  const direction = newProb > oldProb ? "up" : "down";
  const arrow = newProb > oldProb ? "↑" : "↓";

  let post = `${arrow} "${prior.claim}" moved ${direction}: ${oldPct}% → ${newPct}%\n\n`;
  post += `Evidence: ${evidence.slice(0, 120)}`;
  if (evidence.length > 120) post += "...";
  post += `\n\nhttps://priors-rho.vercel.app/prior/${prior.slug}`;

  return post;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] ?? "trending";

  console.log(`Priors Twitter Bot — mode: ${mode}`);
  console.log(`API: ${PRIORS_API}`);
  console.log(DRY_RUN ? "DRY RUN mode\n" : "\n");

  if (mode === "trending") {
    const priors = await getTrending();
    if (priors.length === 0) {
      console.log("No trending priors to post.");
      return;
    }
    const post = formatTrendingPost(priors);
    console.log(`Post (${post.length} chars):`);
    await tweet(post);
  } else if (mode === "moves") {
    // Find priors with big probability changes in the last 24 hours
    const priors = await getTrending();
    for (const prior of priors.slice(0, 10)) {
      const updates = await getRecentUpdates(prior.slug);
      if (updates.length === 0) continue;

      const latest = updates[0];
      const delta = Math.abs(latest.probabilityAfter - latest.probabilityBefore);

      if (delta >= 0.05) {
        // 5%+ move — noteworthy
        const post = formatBigMovePost(
          prior,
          latest.probabilityBefore,
          latest.probabilityAfter,
          latest.evidenceDescription
        );
        console.log(`Big move (${(delta * 100).toFixed(0)}%):`);
        await tweet(post);
      }
    }
  }
}

main().catch(console.error);
