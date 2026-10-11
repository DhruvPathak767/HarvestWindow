import React, { useState, useRef, useCallback } from "react";
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/common/ui";
import { useStore } from "@/store/AppStore";
import { cn } from "@/utils/cn";

interface Props {
  onAnalyze: (file: File, cropId?: string) => Promise<void>;
  analyzing: boolean;
  preselectedCropId?: string;
  className?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploadZone({
  onAnalyze,
  analyzing,
  preselectedCropId,
  className,
}: Props) {
  const { crops } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCropId, setSelectedCropId] = useState<string>(preselectedCropId || "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setValidationError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError("Unsupported file format. Please upload JPEG, PNG, or WebP images.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError("File is too large. Maximum supported image size is 10 MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    try {
      await onAnalyze(selectedFile, selectedCropId || undefined);
    } catch {
      // Error handled by parent or hook
    }
  };

  return (
    <div className={cn("bg-card border border-border/80 rounded-2xl p-6 shadow-sm", className)}>
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="text-lg font-bold font-display text-forest-deep flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-living" />
            Upload Leaf Image for Diagnosis
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Identify plant diseases across 25 agricultural conditions with verified ICAR advisory
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Optional Crop Selection */}
        {crops.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-forest-deep uppercase tracking-wider mb-1.5">
              Associated Field Crop (Optional)
            </label>
            <select
              value={selectedCropId}
              onChange={(e) => setSelectedCropId(e.target.value)}
              disabled={analyzing || !!preselectedCropId}
              className="w-full text-xs font-medium rounded-lg border border-line bg-cream/30 px-3 py-2 text-forest-deep focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="">-- No specific crop (Detect automatically) --</option>
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.variety ? `(${c.variety})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hidden File & Camera Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={analyzing}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={analyzing}
        />

        {/* Upload Drop Zone or Image Preview */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px]",
              isDragging
                ? "border-living bg-living/5 scale-[0.99]"
                : "border-line/80 hover:border-forest/50 hover:bg-cream/20"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-full bg-forest/10 flex items-center justify-center text-forest mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-forest-deep">
              Click or drag a leaf photo here
            </p>
            <p className="text-xs text-muted mt-1 max-w-sm">
              Supports JPEG, PNG, or WebP up to 10 MB. For best results, capture clear, focused views of leaf lesions.
            </p>

            <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1.5"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Browse Files
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1.5"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="w-3.5 h-3.5" />
                Capture with Camera
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-cream/30 p-4 relative">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {previewUrl && (
                <div className="relative w-36 h-36 rounded-lg overflow-hidden border border-line bg-forest-deep/5 shrink-0 shadow-sm">
                  <img
                    src={previewUrl}
                    alt="Leaf upload preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={analyzing}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-forest-deep/80 text-white hover:bg-forest-deep transition-all"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex-1 space-y-1.5 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-forest-deep truncate max-w-[200px]">
                    {selectedFile.name}
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Format: {selectedFile.type.split("/")[1]?.toUpperCase()}
                </p>
                <p className="text-xs text-forest-deep/80 pt-1">
                  Ready to evaluate. Click below to run the computer-vision diagnostic model.
                </p>

                <div className="pt-2 flex gap-2 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={analyzing}
                    onClick={clearSelection}
                    className="text-xs text-muted hover:text-forest-deep"
                  >
                    Change Image
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Error Message */}
        {validationError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Guidance Alert */}
        <div className="p-3 rounded-lg bg-forest/5 border border-forest/15 text-xs text-forest-deep/80 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-forest shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-forest-deep">Field Inspection Tips:</span>
            <p className="text-[11.5px] leading-relaxed">
              Frame a single leaf with symptomatic spots clearly centered. Ensure natural lighting without direct glare or extreme darkness.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            disabled={!selectedFile || analyzing}
            className="w-full sm:w-auto min-w-[180px] bg-forest text-cream hover:bg-forest-deep transition-all font-semibold flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Leaf Patterns...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Crop Health
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
