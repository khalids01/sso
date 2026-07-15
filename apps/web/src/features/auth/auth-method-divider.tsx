export function AuthMethodDivider({ label }: { label: string }) {
  return (
    <div className="relative" role="separator" aria-label={label}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-3 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
