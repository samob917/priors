"use client";

import { useState } from "react";

export function VoteButtons({ updateId }: { updateId: string }) {
  const [voted, setVoted] = useState<"UP" | "DOWN" | null>(null);
  const [loading, setLoading] = useState(false);

  async function vote(direction: "UP" | "DOWN") {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/updates/${updateId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });

      if (res.ok) {
        setVoted(direction);
      }
    } catch {
      // silent fail for votes
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => vote("UP")}
        disabled={loading}
        className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
          voted === "UP"
            ? "text-green-400"
            : "text-zinc-600 hover:text-zinc-400"
        }`}
        title="Good evidence"
      >
        ▲
      </button>
      <button
        onClick={() => vote("DOWN")}
        disabled={loading}
        className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
          voted === "DOWN"
            ? "text-red-400"
            : "text-zinc-600 hover:text-zinc-400"
        }`}
        title="Poor evidence"
      >
        ▼
      </button>
    </div>
  );
}
