import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Leaf, X } from "lucide-react";
import { cn } from "@/utils/cn";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id" | "tone"> & { tone?: ToastTone }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { bar: string; icon: ReactNode; ring: string }> = {
  success: {
    bar: "bg-living",
    ring: "text-living",
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  info: {
    bar: "bg-forest",
    ring: "text-forest",
    icon: <Leaf className="h-4 w-4" aria-hidden />,
  },
  warning: {
    bar: "bg-gold",
    ring: "text-earth",
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
  error: {
    bar: "bg-danger",
    ring: "text-danger",
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, title, description, tone }]);
      window.setTimeout(() => dismiss(id), 4800);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="sr-only">
          {toasts.map((t) => (
            <p key={t.id}>{`${t.title}${t.description ? `: ${t.description}` : ""}`}</p>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = TONE_STYLES[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-md border border-line bg-white shadow-[0_18px_40px_-24px_rgba(22,61,43,0.65)]"
              >
                <span className={cn("w-1 shrink-0", tone.bar)} aria-hidden />
                <div className="flex flex-1 items-start gap-3 p-3.5">
                  <span className={cn("mt-0.5", tone.ring)}>{tone.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13.5px] leading-snug font-semibold text-forest-deep">
                      {t.title}
                    </p>
                    {t.description && (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                        {t.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    className="-m-1 rounded p-1 text-muted transition-colors hover:bg-soft hover:text-forest-deep"
                    aria-label={`Dismiss notification: ${t.title}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
