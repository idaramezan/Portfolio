export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${["published", "available", "connected"].includes(status) ? "border-green/30 bg-green/10" : ["sold_out", "sold"].includes(status) ? "border-coral/30 bg-coral/10 text-coral" : "border-ink/15 bg-ink/5"}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string | number;
  note?: string;
}) {
  return (
    <div className="border border-ink/10 bg-paper p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-ink/50">{note}</p>}
    </div>
  );
}
export function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-ink/55">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-ink/20 bg-paper p-10 text-center">
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm text-ink/55">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
