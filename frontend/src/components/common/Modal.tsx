import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  stepLabel?: string;
}

const SIZES = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  stepLabel,
}: ModalProps) {
  const reduced = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${title.replace(/\s+/g, "-").toLowerCase()}`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("input, select, textarea, button")
        ?.focus();
    }, 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-forest-deep/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-xl border border-line bg-white shadow-[0_40px_80px_-40px_rgba(8,24,16,0.7)] sm:rounded-lg",
              SIZES[size]
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                {stepLabel && (
                  <p className="hw-eyebrow mb-1.5 font-semibold text-living">{stepLabel}</p>
                )}
                <h2
                  id={titleId}
                  className="font-display text-[17px] leading-tight font-bold text-forest-deep"
                >
                  {title}
                </h2>
                {description && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-sm text-muted transition-colors hover:bg-soft hover:text-forest-deep"
                aria-label={`Close ${title}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </header>

            <div className="hw-scroll-x flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {children}
            </div>

            {footer && (
              <footer className="flex items-center justify-between gap-3 border-t border-line bg-cream/60 px-5 py-4 sm:px-6">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
