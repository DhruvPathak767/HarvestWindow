import { Lightbulb, Info } from "lucide-react";

interface Props {
  recommendations: string[];
  explanation: string[];
}

export function WeatherRecommendations({ recommendations, explanation }: Props) {
  if (recommendations.length === 0 && explanation.length === 0) return null;

  return (
    <div className="space-y-3 pt-2">
      {recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            Recommended Agronomic Actions
          </h4>
          <ul className="space-y-1.5">
            {recommendations.map((rec, i) => (
              <li
                key={i}
                className="text-[12.5px] leading-relaxed text-forest-deep flex items-start gap-2 bg-cream/30 p-2.5 rounded-md border border-line/50"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-forest mt-1.5 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-forest" />
            Intelligence Rationale & Limitations
          </h4>
          <div className="space-y-1 text-[12px] text-muted leading-relaxed">
            {explanation.map((exp, i) => (
              <p key={i}>• {exp}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
