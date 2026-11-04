import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Logo } from "../components/Logo";
import { notifyBillsChanged, useBill } from "../hooks/useBills";
import { deleteBill } from "../services/bills";
import { formatMoney } from "../utils/money";

export function BillDetailPage() {
  const { id } = useParams();
  const bill = useBill(id);
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bill) return;
    const url = URL.createObjectURL(bill.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bill]);

  async function onDelete() {
    if (!bill) return;
    const ok = window.confirm("Delete this bill from this device?");
    if (!ok) return;
    try {
      await deleteBill(bill.id);
      notifyBillsChanged();
      navigate("/history");
    } catch {
      setError("Could not delete this bill.");
    }
  }

  if (!bill) {
    return (
      <main className="px-4 pt-10">
        <p className="text-sm text-slate-500">This bill was not found.</p>
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold text-navy">{bill.merchant}</h1>
      <p className="mt-1 text-sm text-slate-500">Saved {new Date(bill.createdAt).toLocaleString()}</p>
      {imageUrl && <img src={imageUrl} alt={`${bill.merchant} receipt`} className="mt-4 h-56 w-full rounded-3xl object-cover shadow-card" />}
      <dl className="mt-5 space-y-3 rounded-3xl bg-white p-4 shadow-card">
        <Row label="Date" value={bill.date || "Not provided"} />
        <Row label="Amount" value={formatMoney(bill.totalAmount, bill.currency)} />
        <Row label="Category" value={bill.category} />
        <Row label="Verified" value={bill.userVerified ? "Reviewed by you" : "Needs review"} />
      </dl>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={() => void onDelete()} className="mt-4 min-h-12 w-full rounded-2xl bg-red-50 text-sm font-semibold text-red-700">
        Delete bill
      </button>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
