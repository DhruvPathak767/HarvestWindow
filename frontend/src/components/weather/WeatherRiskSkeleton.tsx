import { Card } from "@/components/common/ui";

export function WeatherRiskSkeleton() {
  return (
    <Card className="p-6 animate-pulse border-line/60 bg-white/70">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-deep/10" />
            <div className="space-y-2">
              <div className="w-48 h-5 rounded bg-forest-deep/10" />
              <div className="w-32 h-3.5 rounded bg-forest-deep/5" />
            </div>
          </div>
          <div className="w-24 h-8 rounded-full bg-forest-deep/10" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3.5 rounded-lg border border-line/40 bg-soft/50 space-y-2">
              <div className="w-20 h-3.5 rounded bg-forest-deep/10" />
              <div className="w-12 h-6 rounded bg-forest-deep/15" />
              <div className="w-full h-1.5 rounded bg-forest-deep/5" />
            </div>
          ))}
        </div>

        <div className="w-full h-16 rounded-lg bg-soft/60" />
      </div>
    </Card>
  );
}
