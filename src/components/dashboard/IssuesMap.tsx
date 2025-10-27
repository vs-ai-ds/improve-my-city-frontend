// File: src/components/dashboard/StatusPie.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function StatusPie({
  data,
  onPick,
}: {
  data: { name: string; value: number }[];
  onPick: (status: string) => void;
}) {
  const COLORS = ["#f59e0b", "#eab308", "#10b981", "#9ca3af"];
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={90}
            onClick={(e: any) => e?.name && onPick(e.name)}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}