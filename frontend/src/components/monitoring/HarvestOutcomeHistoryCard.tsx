import React, { useState } from "react";
import { HarvestOutcome, UpdateHarvestOutcomePayload } from "@/types";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Save,
  X,
  ShieldCheck,
  Check
} from "lucide-react";

interface Props {
  outcomes: HarvestOutcome[];
  onUpdateOutcome?: (outcomeId: string, payload: UpdateHarvestOutcomePayload) => Promise<void>;
  loading?: boolean;
}

export const HarvestOutcomeHistoryCard: React.FC<Props> = ({
  outcomes,
  onUpdateOutcome,
  loading,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  if (loading) {
    return <div className="h-44 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />;
  }

  if (outcomes.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 text-center text-slate-400 text-xs">
        No actual harvest outcomes recorded for this crop yet.
      </div>
    );
  }

  const startEdit = (outcome: HarvestOutcome) => {
    setEditingId(outcome.id);
    setEditDate(outcome.actualHarvestDate.slice(0, 10));
    setEditNotes(outcome.notes || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (outcomeId: string) => {
    if (!onUpdateOutcome) return;
    setUpdating(true);
    try {
      await onUpdateOutcome(outcomeId, {
        actualHarvestDate: editDate,
        notes: editNotes,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-3">
      {outcomes.map((out) => {
        const evalItem = out.evaluations && out.evaluations.length > 0 ? out.evaluations[0] : null;
        const isEditing = editingId === out.id;

        return (
          <div
            key={out.id}
            className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">
                  Recorded: {new Date(out.actualHarvestDate).toLocaleDateString()}
                </span>
                {out.verificationStatus === "VERIFIED" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Ground Truth</span>
                  </span>
                ) : out.verificationStatus === "CORRECTED" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                    Corrected Entry (Rev {out.correctionCount})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>Pending Verification</span>
                  </span>
                )}
              </div>

              {!isEditing && onUpdateOutcome && (
                <button
                  onClick={() => startEdit(out)}
                  className="text-slate-400 hover:text-white flex items-center space-x-1 text-[11px] transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Correct</span>
                </button>
              )}
            </div>

            {/* Error & Comparison Details */}
            {isEditing ? (
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Correct Actual Harvest Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Correction Note</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Reason for date correction..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={cancelEdit}
                    disabled={updating}
                    className="px-2.5 py-1 bg-slate-700 text-slate-300 rounded text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(out.id)}
                    disabled={updating}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs flex items-center space-x-1"
                  >
                    <Save className="w-3 h-3" />
                    <span>{updating ? "Saving..." : "Save Correction"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[11px]">Predicted Date</span>
                  <span className="font-semibold text-white">
                    {evalItem ? new Date(evalItem.predictedHarvestDate).toLocaleDateString() : "None"}
                  </span>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[11px]">Prediction Error</span>
                  <span
                    className={`font-semibold ${
                      evalItem?.isExactDate
                        ? "text-emerald-400"
                        : evalItem?.isWithin3Days
                        ? "text-sky-400"
                        : "text-amber-400"
                    }`}
                  >
                    {evalItem
                      ? evalItem.errorDays === 0
                        ? "Exact Match (0d)"
                        : `${evalItem.errorDays > 0 ? "+" : ""}${evalItem.errorDays} days (${evalItem.errorDays > 0 ? "Late" : "Early"})`
                      : "Pending"}
                  </span>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[11px]">Window Position</span>
                  <span className="font-semibold text-white">
                    {evalItem?.isWithinWindow ? "Inside Window" : evalItem?.windowDistanceDays ? `${evalItem.windowDistanceDays}d outside` : "N/A"}
                  </span>
                </div>
                <div className="bg-slate-800/40 rounded-lg p-2.5">
                  <span className="text-slate-400 block text-[11px]">Retraining Consent</span>
                  <span
                    className={`font-semibold ${
                      out.consentTraining ? "text-emerald-400" : "text-slate-400"
                    }`}
                  >
                    {out.consentTraining ? "Opted In" : "Evaluation Only"}
                  </span>
                </div>
              </div>
            )}

            {out.notes && !isEditing && (
              <p className="text-xs text-slate-400 italic bg-slate-800/20 rounded p-2 border border-slate-800">
                "{out.notes}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
