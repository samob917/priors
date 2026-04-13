"use client";

import { useState, useEffect } from "react";

interface ApiKeyInfo {
  id: string;
  prefix: string;
  label: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read", "write"]);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label) return;
    setCreating(true);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, scopes }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewKey(data.rawKey);
        setLabel("");
        setShowCreate(false);
        fetchKeys();
      }
    } catch {
      // silent
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading keys...</p>;
  }

  return (
    <div>
      {/* Newly created key banner */}
      {newKey && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/10 p-4 mb-4">
          <p className="text-xs text-green-400 font-medium mb-2">
            New API key created — copy it now, it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-zinc-900 rounded px-3 py-2 text-sm font-mono text-zinc-200 overflow-x-auto">
              {newKey}
            </code>
            <button
              onClick={copyKey}
              className="rounded-lg bg-zinc-700 px-3 py-2 text-xs font-medium hover:bg-zinc-600 transition-colors shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-zinc-600 mt-2 hover:text-zinc-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Key list */}
      {keys.length > 0 && (
        <div className="space-y-2 mb-4">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 p-3"
            >
              <div className="flex items-center gap-3">
                <code className="text-xs font-mono text-zinc-400">
                  {key.prefix}...
                </code>
                <span className="text-sm text-zinc-300">{key.label}</span>
                <span className="text-xs text-zinc-600">
                  {key.scopes.join(", ")}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {key.lastUsedAt && (
                  <span className="text-xs text-zinc-600">
                    used {new Date(key.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {keys.length === 0 && !showCreate && (
        <p className="text-sm text-zinc-600 mb-4">
          No API keys yet. Create one to let your agents access the Priors API.
        </p>
      )}

      {/* Create form */}
      {showCreate ? (
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label (e.g. my-research-agent)"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
            autoFocus
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={scopes.includes("read")}
                onChange={(e) =>
                  setScopes((s) =>
                    e.target.checked
                      ? [...s, "read"]
                      : s.filter((x) => x !== "read")
                  )
                }
                className="accent-zinc-400"
              />
              Read
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={scopes.includes("write")}
                onChange={(e) =>
                  setScopes((s) =>
                    e.target.checked
                      ? [...s, "write"]
                      : s.filter((x) => x !== "write")
                  )
                }
                className="accent-zinc-400"
              />
              Write
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!label || scopes.length === 0 || creating}
              className="rounded-lg bg-zinc-200 text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-30"
            >
              {creating ? "Creating..." : "Create key"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          + Create API key
        </button>
      )}
    </div>
  );
}
