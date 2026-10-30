import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from "@/lib/types";

export function PageHeader({ title, subtitle, actions, kicker }: { title: string; subtitle?: string; actions?: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-blood">{kicker}</p>}
        <h1 className="font-display text-4xl font-black uppercase leading-none sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-steel">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-bone/10 bg-white/[0.025] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm ${className ?? ""}`}>{children}</div>;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  processing: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  shipped: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-bone/5 text-steel border-bone/15",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  unpaid: "border-bone/15 text-bone/70",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  refunded: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs ${PAY_STYLE[status]}`}>{PAYMENT_STATUS_LABEL[status]}</span>;
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock <= 0) return <span className="inline-flex rounded-full border border-blood/40 bg-blood/15 px-2.5 py-1 text-xs text-blood">Agotado</span>;
  if (stock <= threshold) return <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">Stock bajo · {stock}</span>;
  return <span className="inline-flex rounded-full border border-bone/10 px-2.5 py-1 text-xs text-bone/70 tabular-nums">{stock} uds</span>;
}

export function StatCard({ label, value, hint, accent, icon }: { label: string; value: React.ReactNode; hint?: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <Card className={`relative overflow-hidden p-5 ${accent ? "border-blood/30" : ""}`}>
      {accent && <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blood/20 blur-2xl" />}
      <div className="relative flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-steel">{label}</p>
        {icon && <span className="text-blood">{icon}</span>}
      </div>
      <p className="relative mt-3 font-display text-4xl font-black tabular-nums leading-none">{value}</p>
      {hint && <p className="relative mt-2 text-xs text-steel">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-col items-start gap-3 border-dashed p-8">
      <p className="font-display text-2xl font-black uppercase">{title}</p>
      {children && <div className="text-sm leading-relaxed text-steel">{children}</div>}
    </Card>
  );
}

export const inputCls =
  "h-11 w-full rounded-xl border border-bone/15 bg-black/40 px-3 text-sm placeholder:text-steel/70 transition focus:border-blood focus:outline-none focus:ring-2 focus:ring-blood/20";
export const labelCls = "font-mono text-[10px] uppercase tracking-[0.2em] text-steel";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-blood px-5 py-2.5 text-sm text-white shadow-[0_0_24px_rgba(225,18,31,0.25)] transition hover:bg-ember disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-full border border-bone/15 px-4 py-2 text-sm transition hover:border-bone/40 disabled:cursor-not-allowed disabled:opacity-40";
