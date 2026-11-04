import { useHealth } from "../hooks/useHealth";

export function ConfigBanner() {
  const health = useHealth();
  if (!health || (health.ok && health.aiConfigured)) return null;

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
      <p className="font-medium">AI is not configured yet.</p>
      <p className="mt-1 text-amber-800">
        Add a Gemini API key to <code className="rounded bg-white px-1">backend/.env</code> as{" "}
        <code className="rounded bg-white px-1">GEMINI_API_KEY</code>, then restart the API. Until then Bill Snap will
        not guess bill details.
      </p>
    </div>
  );
}
