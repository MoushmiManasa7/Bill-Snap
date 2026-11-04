import { Camera, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { BillCard } from "../components/BillCard";
import { ConfigBanner } from "../components/ConfigBanner";
import { Logo } from "../components/Logo";
import { useBills } from "../hooks/useBills";
import { formatMoney } from "../utils/money";

export function HomePage() {
  const bills = useBills();
  const total = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const recent = bills.slice(0, 5);

  return (
    <main className="px-4 pb-6 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-navy">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Snap a bill, review the details, and keep spending in one place.</p>

      <div className="mt-5">
        <ConfigBanner />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <Link
          to="/scan?mode=camera"
          className="flex min-h-24 flex-col items-start justify-between rounded-2xl bg-navy p-4 text-white shadow-card"
        >
          <Camera className="h-5 w-5" />
          <span className="text-sm font-semibold">Scan Bill</span>
        </Link>
        <Link
          to="/scan?mode=gallery"
          className="flex min-h-24 flex-col items-start justify-between rounded-2xl bg-white p-4 text-navy shadow-card"
        >
          <Images className="h-5 w-5" />
          <span className="text-sm font-semibold">Upload from Gallery</span>
        </Link>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <article className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">Total spending</p>
          <p className="mt-2 text-lg font-semibold text-navy">{formatMoney(total)}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">Saved bills</p>
          <p className="mt-2 text-lg font-semibold text-navy">{bills.length}</p>
        </article>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">Recent transactions</h2>
          <Link to="/history" className="text-xs font-medium text-slate-500">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-card">
            No bills yet. Scan a receipt to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {recent.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
