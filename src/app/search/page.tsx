"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Prior {
  slug: string;
  claim: string;
  description: string | null;
  category: string;
  currentProbability: number;
  updateCount: number;
}

const CATEGORIES = [
  "ALL",
  "TECHNOLOGY",
  "ECONOMICS",
  "CULTURE",
  "POLITICS",
  "SCIENCE",
  "HEALTH",
  "SPORTS",
  "OTHER",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priors, setPriors] = useState<Prior[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category !== "ALL") params.set("category", category);
      params.set("limit", "20");

      try {
        const res = await fetch(`/api/priors?${params}`);
        const data = await res.json();
        setPriors(data.priors);
      } catch {
        setPriors([]);
      } finally {
        setLoading(false);
      }
    }, 200); // debounce

    return () => clearTimeout(timeout);
  }, [query, category]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">Search priors</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="What do you want to know? e.g. &quot;best database&quot;, &quot;remote work&quot;"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors mb-4"
        autoFocus
      />

      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              category === cat
                ? "bg-zinc-700 text-zinc-100"
                : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {cat.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-600 py-8 text-center">Searching...</p>
      ) : priors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 mb-3">
            No priors found{query ? ` for "${query}"` : ""}
          </p>
          <Link
            href="/prior/new"
            className="text-sm text-zinc-300 hover:text-white"
          >
            Create a new prior
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/50">
          {priors.map((prior) => (
            <Link
              key={prior.slug}
              href={`/prior/${prior.slug}`}
              className="group flex items-start gap-4 py-4 hover:bg-zinc-900/30 -mx-3 px-3 rounded-lg transition-colors"
            >
              <span className="font-mono text-sm font-semibold text-zinc-300 w-10 text-right shrink-0">
                {Math.round(prior.currentProbability * 100)}%
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                  {prior.claim}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {prior.description}
                </p>
              </div>
              <span className="text-xs text-zinc-600 shrink-0">
                {prior.updateCount} updates
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-zinc-800/50 text-xs text-zinc-600 font-mono">
        GET /api/priors?q={encodeURIComponent(query || "...")}
        {category !== "ALL" ? `&category=${category}` : ""}
      </div>
    </div>
  );
}
