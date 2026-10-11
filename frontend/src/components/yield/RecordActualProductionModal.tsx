import React, { useState } from "react";
import { X, CheckCircle, Scale, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/common/ui";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cropName: string;
  onSubmit: (data: {
    quantity: number;
    unit: string;
    harvestDate: string;
    notes?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function RecordActualProductionModal({
  isOpen,
  onClose,
  cropName,
  onSubmit,
  loading = false,
}: Props) {
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("TONNE");
  const [harvestDate, setHarvestDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quantity);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive harvest quantity.");
      return;
    }

    setError(null);
    try {
      await onSubmit({
        quantity: val,
        unit,
        harvestDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save harvest record.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Record Harvest Output</h2>
            <p className="text-xs text-muted-foreground">Log realized harvest for {cropName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Harvested Quantity & Unit
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 12.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="col-span-2 px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="TONNE">Tonnes</option>
                <option value="QUINTAL">Quintals</option>
                <option value="KG">Kilograms</option>
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {unit === "QUINTAL" && "1 Quintal = 100 kg (0.1 Metric Tonne)"}
              {unit === "TONNE" && "1 Metric Tonne = 1,000 kg"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Harvest Date
            </label>
            <input
              type="date"
              required
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Moisture content, storage facility, combine speed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground gap-1.5"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
