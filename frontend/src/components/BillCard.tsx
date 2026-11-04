import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SavedBill } from "../types/bill";
import { formatMoney } from "../utils/money";

export function BillCard({ bill }: { bill: SavedBill }) {
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(bill.image);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [bill.image]);

  return (
    <Link to={`/history/${bill.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
      ) : (
        <span className="h-14 w-14 rounded-xl bg-slate-100" />
      )}
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium text-navy">{bill.merchant}</p>
        <p className="text-xs text-slate-500">
          {bill.date || "No date"} · {bill.category}
        </p>
      </div>
      <p className="text-sm font-semibold text-navy">{formatMoney(bill.totalAmount, bill.currency)}</p>
    </Link>
  );
}
