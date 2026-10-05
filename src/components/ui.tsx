"use client";

import clsx from "clsx";
import { AlertTriangle, Loader2, RotateCw } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong shadow-[0_8px_24px_-10px_rgb(239_68_68/0.8)]",
  secondary: "bg-surface-3 text-fg border border-line-strong hover:border-faint",
  ghost: "text-muted hover:text-fg hover:bg-surface-3",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("rounded-2xl border border-line bg-surface", className)}>{children}</div>;
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "ok" | "warn"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-surface-3 text-muted border-line-strong",
    accent: "bg-accent-soft text-accent border-accent/30",
    ok: "bg-ok-soft text-ok border-ok/30",
    warn: "bg-warn-soft text-warn border-warn/30",
  };
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{children}</p>;
}

export function SectionTitle({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <p className="flex-1 text-fg">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
          <RotateCw className="size-3.5" aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}

export function Thinking({ steps, label }: { steps?: string[]; label: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-accent" />
        </span>
        <p className="font-semibold">{label}</p>
      </div>
      {steps && (
        <ul className="mt-4 space-y-2 text-sm text-muted">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2 opacity-0 animate-[fadein_0.4s_ease_forwards]" style={{ animationDelay: `${i * 1.2}s` }}>
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> {s}
            </li>
          ))}
        </ul>
      )}
      <style>{`@keyframes fadein { to { opacity: 1 } }`}</style>
    </Card>
  );
}
