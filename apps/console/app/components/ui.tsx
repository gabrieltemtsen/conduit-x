import React from 'react';
import { LucideIcon } from 'lucide-react';

export function Panel({
  children,
  className = '',
  raised = false
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border ${
        raised ? 'border-border-strong bg-panel-hover' : 'border-border bg-panel'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  right
}: {
  icon?: LucideIcon;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  detail
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-data text-2xl font-semibold text-foreground">{value}</span>
        {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
      </div>
      {detail && <div className="text-[11px] text-muted-foreground">{detail}</div>}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-semibold transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 active:translate-y-px';

  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'border border-border bg-panel-hover text-foreground hover:border-border-strong hover:bg-panel',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-panel-hover'
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function StatusDot({ tone = 'success', label }: { tone?: 'success' | 'primary' | 'muted'; label: string }) {
  const colors: Record<string, string> = {
    success: 'text-success',
    primary: 'text-primary',
    muted: 'text-muted-foreground'
  };
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-panel-sunken px-2.5 py-1.5">
      <span className={`live-dot relative inline-flex h-1.5 w-1.5 rounded-full bg-current ${colors[tone]}`} aria-hidden="true" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-md border border-dashed border-border px-6 py-10 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <div className="text-sm font-medium text-foreground">{title}</div>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
