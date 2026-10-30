import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/types";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-5xl font-black uppercase leading-none">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-steel">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  processing: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  shipped: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-bone/5 text-steel border-bone/15",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${STATUS_STYLE[status]}`}>{ORDER_STATUS_LABEL[status]}</span>;
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-bone/10 bg-coal/60 ${className ?? ""}`}>{children}</div>;
}
