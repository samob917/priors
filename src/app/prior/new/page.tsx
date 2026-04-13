"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "TECHNOLOGY",
  "ECONOMICS",
  "POLITICS",
  "SCIENCE",
  "CULTURE",
  "HEALTH",
  "SPORTS",
  "OTHER",
];

export default function NewPriorPage() {
  const router = useRouter();
  const [claim, setClaim] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("TECHNOLOGY");
  const [probability, setProbability] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (claim.length < 10) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/priors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim,
          description: description || undefined,
          category,
          initialProbability: probability / 100,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.existingSlug) {
          router.push(`/prior/${data.error.existingSlug}`);
          return;
        }
        setError(data.error?.message ?? "Failed to create prior");
        return;
      }

      const data = await res.json();
      router.push(`/prior/${data.slug}`);
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-2">Create a new prior</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Define a claim and set your initial probability estimate. Others can then
        update it with evidence.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Claim</label>
          <input
            type="text"
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder='e.g. "Rust will overtake Go for backend services by 2030"'
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <p className="text-xs text-zinc-600 mt-1">
            A specific, falsifiable statement. 10-500 characters.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, scope, and how this should be evaluated..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 resize-none h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  category === cat
                    ? "bg-zinc-700 text-zinc-100"
                    : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800"
                }`}
              >
                {cat.toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Initial probability
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="99"
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="flex-1 accent-zinc-400"
            />
            <span className="font-mono text-2xl font-bold w-16 text-right">
              {probability}%
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1">
            Your best estimate. This will be updated as evidence comes in.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        <button
          type="submit"
          disabled={claim.length < 10 || submitting}
          className="w-full rounded-lg bg-zinc-200 text-zinc-950 py-3 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating..." : "Create prior"}
        </button>

        {claim.length >= 10 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 font-mono mb-2">
              POST /api/priors
            </p>
            <pre className="text-xs text-zinc-400 overflow-x-auto">
              {JSON.stringify(
                {
                  claim,
                  description: description || undefined,
                  category,
                  initialProbability: probability / 100,
                },
                null,
                2
              )}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
