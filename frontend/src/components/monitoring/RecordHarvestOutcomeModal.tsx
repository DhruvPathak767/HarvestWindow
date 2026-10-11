import React, { useState } from "react";
import { X, Calendar, CheckSquare, ShieldCheck, Info, AlertCircle } from "lucide-react";
import { RecordHarvestOutcomePayload } from "@/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RecordHarvestOutcomePayload) => Promise<void>;
  cropName: string;
  predictedHarvestDate?: string | null;
}

export const RecordHarvestOutcomeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmit,
  cropName,
  predictedHarvestDate,
}) => {
  const [actualDate, setActualDate] = useState(new Date().toISOString().slice(0, 10));
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [consentEvaluation, setConsentEvaluation] = useState(true);
  const [consentTraining, setConsentTraining] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualDate) {
      setError("Please select the actual harvest date.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await onSubmit({
        actualHarvestDate: actualDate,
        actualHarvestStart: actualStart || undefined,
        actualHarvestEnd: actualEnd || undefined,
        consentEvaluation,
        consentTraining,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record harvest outcome.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Record Harvest Outcome</h2>
              <p className="text-xs text-slate-400">{cropName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Predicted Reference */}
          {predictedHarvestDate && (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs flex items-center justify-between text-slate-300">
              <span>Predicted Target Date:</span>
              <span className="font-semibold text-emerald-400 font-mono">
                {new Date(predictedHarvestDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Actual Harvest Date */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Actual Harvest Date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              required
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Optional Multi-Day Window */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Harvest Start (Optional)
              </label>
              <input
                type="date"
                value={actualStart}
                onChange={(e) => setActualStart(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Harvest End (Optional)
              </label>
              <input
                type="date"
                value={actualEnd}
                onChange={(e) => setActualEnd(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Field Notes / Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ripened early due to sustained sunny spells, harvested before rain..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Granular Consent Controls */}
          <div className="bg-slate-800/30 border border-slate-700/60 rounded-xl p-4 space-y-3 pt-3">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
              Data Privacy & Usage Permissions
            </span>

            {/* Evaluation Consent */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentEvaluation}
                onChange={(e) => setConsentEvaluation(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
              />
              <span className="text-xs text-slate-300">
                <span className="font-medium text-white block">Include in Platform Accuracy Benchmarks</span>
                Permit anonymized date comparison to calculate aggregate HarvestWindow error metrics.
              </span>
            </label>

            {/* Model Retraining Consent */}
            <label className="flex items-start space-x-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consentTraining}
                onChange={(e) => setConsentTraining(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
              />
              <span className="text-xs text-slate-300">
                <span className="font-medium text-white block">Opt-in for Candidate AI Model Retraining</span>
                Authorize secondary algorithmic calibration. No personally identifiable farmer information (PII) or farm location coordinates are ever included.
              </span>
            </label>
          </div>

          {/* Verification Status Notice */}
          <div className="text-[11px] text-slate-400 flex items-center space-x-2 pt-1">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <span>
              Your submission will initially enter <strong className="text-slate-300">Pending Verification</strong> status before aggregate inclusion.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Recording..." : "Record Outcome"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
