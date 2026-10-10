import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/utils/cn";

const CONTROL_BASE =
  "w-full rounded-sm border bg-white px-3 text-[13.5px] text-ink transition-colors duration-150 placeholder:text-muted/70 focus:border-forest focus:outline-none disabled:bg-soft disabled:text-muted";

export function FieldShell({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="font-display text-[12.5px] font-semibold tracking-[-0.005em] text-forest-deep"
      >
        {label}
        {required && <span className="ml-0.5 text-caution">*</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-[12px] font-medium text-danger"
            role="alert"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-[12px] leading-relaxed text-muted">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  leadingIcon?: ReactNode;
}

export function TextField({
  label,
  hint,
  error,
  required,
  className,
  leadingIcon,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          aria-invalid={!!error}
          className={cn(
            CONTROL_BASE,
            "h-10",
            leadingIcon && "pl-9",
            error ? "border-danger/60" : "border-line"
          )}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  required,
  className,
  ...rest
}: SelectFieldProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          className={cn(
            CONTROL_BASE,
            "h-10 appearance-none pr-9",
            error ? "border-danger/60" : "border-line"
          )}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    </FieldShell>
  );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className,
  rows = 3,
  ...rest
}: TextAreaFieldProps) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
      className={className}
    >
      <textarea
        id={id}
        rows={rows}
        aria-invalid={!!error}
        className={cn(
          CONTROL_BASE,
          "resize-y py-2.5 leading-relaxed",
          error ? "border-danger/60" : "border-line"
        )}
        {...rest}
      />
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  description,
  checked,
  onChange,
  error,
  id,
}: {
  label: ReactNode;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  id?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border transition-all duration-150",
            checked ? "border-forest bg-forest text-cream" : "border-line bg-white"
          )}
        >
          <AnimatePresence>
            {checked && (
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="h-3 w-3" aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <input
          id={inputId}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="text-[13px] leading-snug text-ink">
          {label}
          {description && (
            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
              {description}
            </span>
          )}
        </span>
      </label>
      {error && (
        <p className="pl-7 text-[12px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="font-display text-[13.5px] font-semibold text-forest-deep"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-forest bg-forest" : "border-line bg-soft"
        )}
      >
        <motion.span
          layout
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2 rounded-full bg-white shadow-sm",
            checked ? "left-[calc(100%-1.35rem)]" : "left-1"
          )}
          style={{ height: 18, width: 18 }}
          aria-hidden
        />
      </button>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-sm border border-line bg-soft/70 p-0.5",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-[3px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150",
              active ? "text-cream" : "text-muted hover:text-forest-deep"
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${ariaLabel}`}
                className="absolute inset-0 rounded-[3px] bg-forest-deep"
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Searchable single-select used for the crop picker. */
export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  error,
  hint,
  required,
}: {
  label: string;
  options: { value: string; label: string; meta?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.meta ?? ""}`.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div ref={wrapRef} className="relative">
        <div
          className={cn(
            "flex h-10 items-center gap-2 rounded-sm border bg-white px-3",
            error ? "border-danger/60" : open ? "border-forest" : "border-line"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <input
            id={id}
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            className="h-full flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted/70"
            placeholder={selected ? selected.label : placeholder}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min(h + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter" && open && filtered[highlight]) {
                e.preventDefault();
                onChange(filtered[highlight].value);
                setQuery("");
                setOpen(false);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setQuery("");
              }}
              className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-forest"
            >
              {selected.label}
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.ul
              id={`${id}-list`}
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="hw-scroll-x absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-sm border border-line bg-white p-1 shadow-[0_20px_40px_-24px_rgba(22,61,43,0.6)]"
            >
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-[12.5px] text-muted">
                  No crop matches “{query}”. Pick the closest match and note it below.
                </li>
              )}
              {filtered.map((o, i) => (
                <li key={o.value} role="option" aria-selected={o.value === value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => {
                      onChange(o.value);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-[3px] px-3 py-2 text-left transition-colors",
                      i === highlight ? "bg-soft" : "bg-transparent"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">
                        {o.label}
                      </span>
                      {o.meta && (
                        <span className="block truncate text-[11.5px] text-muted">
                          {o.meta}
                        </span>
                      )}
                    </span>
                    {o.value === value && (
                      <Check className="h-4 w-4 shrink-0 text-forest" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </FieldShell>
  );
}
