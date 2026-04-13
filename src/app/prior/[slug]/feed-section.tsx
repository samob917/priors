"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FeedLink {
  id: string;
  externalMarketId: string;
  lastExternalValue: number | null;
  lastPolledAt: string | null;
  dampingFactor: number;
  isActive: boolean;
  dataFeed: { name: string; provider: string };
}

interface AvailableFeed {
  id: string;
  name: string;
  provider: string;
}

export function FeedSection({ slug }: { slug: string }) {
  const router = useRouter();
  const [links, setLinks] = useState<FeedLink[]>([]);
  const [feeds, setFeeds] = useState<AvailableFeed[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedFeed, setSelectedFeed] = useState("");
  const [marketId, setMarketId] = useState("");
  const [damping, setDamping] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/priors/${slug}/feeds`)
      .then((r) => r.json())
      .then((d) => setLinks(d.feeds ?? []))
      .catch(() => {});
    fetch("/api/feeds")
      .then((r) => r.json())
      .then((d) => {
        setFeeds(d.feeds ?? []);
        if (d.feeds?.length) setSelectedFeed(d.feeds[0].id);
      })
      .catch(() => {});
  }, [slug]);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!marketId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/priors/${slug}/feeds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataFeedId: selectedFeed,
          externalMarketId: marketId,
          dampingFactor: damping / 100,
        }),
      });

      if (res.ok) {
        const link = await res.json();
        setLinks((prev) => [...prev, link]);
        setMarketId("");
        setShowForm(false);
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlink(linkId: string) {
    await fetch(`/api/priors/${slug}/feeds/${linkId}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
    router.refresh();
  }

  const providerColors: Record<string, string> = {
    KALSHI: "border-blue-800/50 text-blue-400",
    POLYMARKET: "border-purple-800/50 text-purple-400",
    CUSTOM: "border-zinc-700 text-zinc-400",
  };

  return (
    <div className="rounded-lg border border-zinc-800 p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Data feeds</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showForm ? "Cancel" : "+ Link feed"}
        </button>
      </div>

      {links.length === 0 && !showForm && (
        <p className="text-xs text-zinc-600">
          No feeds linked. Connect a Kalshi or Polymarket market to auto-update
          this prior.
        </p>
      )}

      {/* Linked feeds */}
      {links.length > 0 && (
        <div className="space-y-2 mb-3">
          {links.map((link) => (
            <div
              key={link.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                providerColors[link.dataFeed.provider] ?? "border-zinc-700 text-zinc-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{link.dataFeed.name}</span>
                <span className="text-zinc-600 font-mono">
                  {link.externalMarketId}
                </span>
                {link.lastExternalValue != null && (
                  <span className="text-zinc-500">
                    {(link.lastExternalValue * 100).toFixed(1)}%
                  </span>
                )}
                {link.lastPolledAt && (
                  <span className="text-zinc-700">
                    polled {new Date(link.lastPolledAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleUnlink(link.id)}
                className="text-zinc-700 hover:text-red-400 transition-colors ml-2"
                title="Unlink"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Link form */}
      {showForm && (
        <form onSubmit={handleLink} className="space-y-3 mt-3">
          <div className="flex gap-2">
            <select
              value={selectedFeed}
              onChange={(e) => setSelectedFeed(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-50"
            >
              {feeds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              placeholder="Market ID (e.g. USREC-2027)"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">Damping:</span>
            <input
              type="range"
              min="5"
              max="100"
              value={damping}
              onChange={(e) => setDamping(Number(e.target.value))}
              className="w-32 accent-zinc-400"
            />
            <span className="text-xs text-zinc-500 font-mono w-8">
              {damping}%
            </span>
            <span className="text-xs text-zinc-700">
              {damping <= 20
                ? "(gentle)"
                : damping <= 50
                  ? "(moderate)"
                  : "(strong)"}
            </span>
          </div>
          <button
            type="submit"
            disabled={!marketId || submitting}
            className="rounded-lg bg-zinc-700 px-4 py-1.5 text-xs font-medium hover:bg-zinc-600 transition-colors disabled:opacity-30"
          >
            {submitting ? "Linking..." : "Link feed"}
          </button>
        </form>
      )}
    </div>
  );
}
