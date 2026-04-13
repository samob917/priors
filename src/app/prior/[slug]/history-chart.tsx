"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Update {
  probabilityAfter: number;
  createdAt: string;
  evidenceDescription: string;
  sourceType: string;
}

export function HistoryChart({
  updates,
  initialProbability,
  createdAt,
}: {
  updates: Update[];
  initialProbability: number;
  createdAt: string;
}) {
  if (updates.length === 0) return null;

  // Build data points: start with creation, then each update in chronological order
  const sorted = [...updates].reverse();
  const data = [
    {
      date: new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      probability: Math.round(initialProbability * 100),
      label: "Created",
    },
    ...sorted.map((u) => ({
      date: new Date(u.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      probability: Math.round(u.probabilityAfter * 100),
      label: u.evidenceDescription.slice(0, 60),
    })),
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4">
        Probability over time
      </h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={{ stroke: "#27272a" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <ReferenceLine
            y={50}
            stroke="#3f3f46"
            strokeDasharray="3 3"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: number) => [`${value}%`, "Probability"]}
          />
          <Line
            type="stepAfter"
            dataKey="probability"
            stroke="#a1a1aa"
            strokeWidth={2}
            dot={{ r: 3, fill: "#a1a1aa", stroke: "#18181b", strokeWidth: 2 }}
            activeDot={{ r: 5, fill: "#e4e4e7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
