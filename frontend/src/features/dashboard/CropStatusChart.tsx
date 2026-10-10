import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/utils/cn";

interface DistributionItem {
  stage: string;
  count: number;
  label?: string;
}

interface CropStatusChartProps {
  distribution: DistributionItem[];
  className?: string;
  height?: number;
}

const STAGE_COLORS: Record<string, string> = {
  Sowing: "#8A6415",
  "Sowing & establishment": "#8A6415",
  Seedling: "#4E7B3A",
  Vegetative: "#2F5D38",
  "Vegetative growth": "#2F5D38",
  Tillering: "#3E7B4C",
  Squaring: "#2F5D38",
  Flowering: "#D97706",
  "Heading & flowering": "#D97706",
  "Fruit set": "#E69A33",
  "Pod development": "#C27803",
  Ripening: "#B45309",
  "Harvest Ready": "#163D2B",
  "Harvest ready": "#163D2B",
  Harvested: "#8A6415",
};

const DEFAULT_COLOR = "#2F5D38";

export function CropStatusChart({
  distribution,
  className,
  height = 200,
}: CropStatusChartProps) {
  if (!distribution || distribution.length === 0 || distribution.every((d) => d.count === 0)) {
    return (
      <div
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-md border border-dashed border-line bg-cream/30 p-6 text-center text-[12.5px] text-muted",
          className
        )}
        style={{ height }}
      >
        <p className="font-semibold text-forest-deep">No stage observations yet</p>
        <p className="mt-1 text-[11.5px]">Add crops to view their developmental distribution across farms.</p>
      </div>
    );
  }

  const chartData = distribution
    .filter((item) => item.count > 0)
    .map((item) => ({
      name: item.label ?? item.stage,
      count: item.count,
      color: STAGE_COLORS[item.label ?? item.stage] || DEFAULT_COLOR,
    }));

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 12, right: 12, bottom: 20, left: -20 }}
          barCategoryGap="20%"
        >
          <CartesianGrid stroke="#E3E7DC" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#4A524A", fontFamily: "IBM Plex Sans, sans-serif" }}
            axisLine={{ stroke: "#E3E7DC" }}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#6B756B", fontFamily: "IBM Plex Mono, monospace" }}
            axisLine={{ stroke: "#E3E7DC" }}
            tickLine={false}
            domain={[0, "auto"]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload as { name: string; count: number };
              return (
                <div className="rounded-md border border-line bg-white/95 px-3 py-2 shadow-md">
                  <p className="font-display text-[12.5px] font-bold text-forest-deep">
                    {data.name}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-muted">
                    <span className="font-semibold text-forest">{data.count}</span>{" "}
                    {data.count === 1 ? "crop record" : "crop records"}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
