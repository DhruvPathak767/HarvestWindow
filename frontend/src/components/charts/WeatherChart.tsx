import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeatherDay } from "@/types";
import { CONDITION_LABEL } from "@/services/weather/weatherService";
import { formatShortDate, formatWeekday } from "@/utils/date";
import { cn } from "@/utils/cn";

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
  color?: string;
  payload?: WeatherDay & { label: string };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const day = payload[0]?.payload;
  if (!day) return null;

  return (
    <div className="rounded-md border border-line bg-white/95 px-3 py-2 shadow-[0_12px_28px_-18px_rgba(22,61,43,0.7)]">
      <p className="font-display text-[12.5px] font-bold text-forest-deep">
        {formatWeekday(day.date)} · {formatShortDate(day.date)}
      </p>
      <p className="mt-0.5 text-[11.5px] text-muted">{CONDITION_LABEL[day.condition]}</p>
      <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11.5px]">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">Max</dt>
          <dd className="hw-num font-semibold text-forest-deep">{day.maxTempC}°</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">Rain</dt>
          <dd className="hw-num font-semibold text-info">{day.rainfallMm} mm</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">Min</dt>
          <dd className="hw-num font-semibold text-forest-deep">{day.minTempC}°</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted">Humidity</dt>
          <dd className="hw-num font-semibold text-muted">{day.humidity}%</dd>
        </div>
      </dl>
    </div>
  );
}

export function WeatherChart({
  daily,
  className,
  height = 230,
  showRainAxis = true,
}: {
  daily: WeatherDay[];
  className?: string;
  height?: number;
  showRainAxis?: boolean;
}) {
  const data = daily.map((d) => ({ ...d, label: formatWeekday(d.date) }));

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#E3E7DC" strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6B756B", fontFamily: "IBM Plex Mono" }}
            axisLine={{ stroke: "#E3E7DC" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="temp"
            tick={{ fontSize: 11, fill: "#6B756B", fontFamily: "IBM Plex Mono" }}
            axisLine={false}
            tickLine={false}
            width={44}
            unit="°"
            domain={["dataMin - 4", "dataMax + 4"]}
          />
          {showRainAxis && (
            <YAxis
              yAxisId="rain"
              orientation="right"
              tick={{ fontSize: 10, fill: "#9AA59A", fontFamily: "IBM Plex Mono" }}
              axisLine={false}
              tickLine={false}
              width={34}
              unit="mm"
              domain={[0, (max: number) => Math.max(20, Math.ceil(max * 1.4))]}
            />
          )}
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(91,140,69,0.07)" }} />
          <Bar
            yAxisId={showRainAxis ? "rain" : "temp"}
            dataKey="rainfallMm"
            name="Rainfall"
            fill="#3E6E8E"
            fillOpacity={0.28}
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
            animationDuration={750}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="maxTempC"
            name="Max temp"
            stroke="#C9762F"
            strokeWidth={2}
            dot={{ r: 2.5, fill: "#C9762F", strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            animationDuration={850}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="minTempC"
            name="Min temp"
            stroke="#245C3A"
            strokeWidth={1.6}
            strokeDasharray="4 4"
            dot={false}
            animationDuration={950}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
