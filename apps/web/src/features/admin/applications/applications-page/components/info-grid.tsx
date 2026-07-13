export function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[140px_1fr]">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words text-sm">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
