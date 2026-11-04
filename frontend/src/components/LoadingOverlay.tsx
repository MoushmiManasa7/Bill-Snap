export function LoadingOverlay({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 p-6 text-center">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy" aria-hidden="true" />
      <p className="mt-4 text-base font-semibold text-navy">{title}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}
