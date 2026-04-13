"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UpdateForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [evidence, setEvidence] = useState("");
  const [strength, setStrength] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    probabilityBefore: number;
    probabilityAfter: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (evidence.length < 5) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/priors/${slug}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceDescription: evidence,
          strength: strength / 100, // slider is -100 to 100, API wants -1 to 1
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message ?? "Failed to submit update");
        return;
      }

      const data = await res.json();
      setResult(data);
      setEvidence("");
      setStrength(0);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const strengthLabel =
    strength === 0
      ? "Neutral"
      : strength > 0
        ? `For (${(strength / 100).toFixed(2)})`
        : `Against (${(strength / 100).toFixed(2)})`;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-800 p-5 mb-8"
    >
      <h2 className="text-sm font-semibold mb-3">Submit evidence</h2>
      <textarea
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        placeholder="Describe the evidence... (min 5 characters)"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 mb-3 resize-none h-20"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Against</span>
          <input
            type="range"
            min="-100"
            max="100"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="w-40 accent-zinc-400"
          />
          <span>For</span>
          <span className="text-zinc-600 ml-2">{strengthLabel}</span>
        </div>
        <button
          type="submit"
          disabled={evidence.length < 5 || submitting}
          className="rounded-lg bg-zinc-700 px-4 py-1.5 text-sm font-medium hover:bg-zinc-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? "Updating..." : "Update"}
        </button>
      </div>

      {result && (
        <div className="mt-3 text-xs text-green-400 font-mono">
          Updated: {Math.round(result.probabilityBefore * 100)}% →{" "}
          {Math.round(result.probabilityAfter * 100)}%
        </div>
      )}
      {error && (
        <div className="mt-3 text-xs text-red-400">{error}</div>
      )}
    </form>
  );
}
