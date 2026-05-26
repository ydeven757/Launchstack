"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export function DashboardChart({ data }: { data: { date: string; visits: number; submits: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="vis" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(37 99 235)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="rgb(37 99 235)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="sub" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgb(22 163 74)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="rgb(22 163 74)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgb(226 232 240)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="rgb(100 116 139)" fontSize={11} />
          <YAxis stroke="rgb(100 116 139)" fontSize={11} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid rgb(226 232 240)", fontSize: 12 }} />
          <Area type="monotone" dataKey="visits" stroke="rgb(37 99 235)" fill="url(#vis)" name="Visits" />
          <Area type="monotone" dataKey="submits" stroke="rgb(22 163 74)" fill="url(#sub)" name="Opt-ins" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
