import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import { Logo } from "../components/Logo";
import { notifyBillsChanged } from "../hooks/useBills";
import { findDuplicate, saveBill } from "../services/bills";
import { clearPendingReview, getPendingReview } from "../services/scanStore";
import { CATEGORIES, type ConfidenceLevel, type ExpenseCategory } from "../types/bill";
import { parseIndianAmount } from "../utils/money";
import { draftWarnings } from "../utils/validation";

export function ReviewPage() {
  const navigate = useNavigate();
  const pending = getPendingReview();
  const [merchant, setMerchant] = useState(pending?.merchant ?? "");
  const [date, setDate] = useState(pending?.date ?? "");
  const [amount, setAmount] = useState(pending?.totalAmount ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(pending?.category ?? "Other");
  const [merchantConfidence, setMerchantConfidence] = useState<ConfidenceLevel>(pending?.merchantConfidence ?? "low");
  const [dateConfidence, setDateConfidence] = useState<ConfidenceLevel>(pending?.dateConfidence ?? "low");
  const [amountConfidence, setAmountConfidence] = useState<ConfidenceLevel>(pending?.amountConfidence ?? "low");
  const [categoryConfidence, setCategoryConfidence] = useState<ConfidenceLevel>(pending?.categoryConfidence ?? "low");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const draft = useMemo(
    () =>
      pending
        ? {
            ...pending,
            merchant,
            date,
            totalAmount: amount,
            category,
            merchantConfidence,
            dateConfidence,
            amountConfidence,
            categoryConfidence,
            warnings: [],
          }
        : null,
    [pending, merchant, date, amount, category, merchantConfidence, dateConfidence, amountConfidence, categoryConfidence],
  );

  const warnings = draft ? draftWarnings(draft) : [];
  const uncertain = warnings.length > 0;

  if (!pending || !draft) {
    return (
      <main className="px-4 pt-10">
        <p className="text-sm text-slate-500">No bill is waiting for review. Scan or upload a receipt first.</p>
        <button type="button" className="mt-4 text-sm font-semibold text-navy" onClick={() => navigate("/scan")}>
          Go to Scan
        </button>
      </main>
    );
  }

  const imageBlob = pending.imageBlob;
  const currency = pending.currency || "INR";
  const previewUrl = pending.previewUrl;

  async function persist(userVerified: boolean) {
    const parsedAmount = parseIndianAmount(amount);
    if (!merchant.trim()) {
      setError("Please enter the merchant name.");
      return;
    }
    if (parsedAmount === null) {
      setError("Please enter a valid total amount.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const duplicate = await findDuplicate(merchant, date || null, parsedAmount, imageBlob);
      if (duplicate) {
        setError("This looks like a bill you already saved. Open History if you want to review it.");
        setBusy(false);
        return;
      }
      const saved = await saveBill({
        merchant,
        date: date || null,
        totalAmount: parsedAmount,
        currency,
        category,
        image: imageBlob,
        userVerified,
      });
      notifyBillsChanged();
      clearPendingReview();
      navigate(`/history/${saved.id}`, { replace: true });
    } catch {
      setError("Could not save this bill to local storage. Check that your browser allows IndexedDB.");
      setBusy(false);
    }
  }

  function onSave() {
    if (uncertain) {
      setConfirmOpen(true);
      return;
    }
    void persist(true);
  }

  return (
    <main className="px-4 pb-8 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold text-navy">Review details</h1>
      <p className="mt-1 text-sm text-slate-500">Correct anything that looks wrong before saving. Uncertain fields stay flagged.</p>

      <img src={previewUrl} alt="Bill preview" className="mt-4 h-48 w-full rounded-3xl object-cover shadow-card" />

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <Field
          label="Merchant"
          confidence={merchantConfidence}
        >
          <input
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
            value={merchant}
            onChange={(event) => {
              setMerchant(event.target.value);
              setMerchantConfidence("high");
            }}
          />
        </Field>
        <Field label="Date" confidence={dateConfidence}>
          <input
            type="date"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setDateConfidence(event.target.value ? "high" : "low");
            }}
          />
        </Field>
        <Field label="Total amount" confidence={amountConfidence}>
          <input
            inputMode="decimal"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setAmountConfidence(parseIndianAmount(event.target.value) === null ? "low" : "high");
            }}
          />
        </Field>
        <Field label="Category" confidence={categoryConfidence}>
          <select
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value as ExpenseCategory);
              setCategoryConfidence("high");
            }}
          >
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        {warnings.length > 0 && (
          <ul className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-2xl bg-navy text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Confirm and save"}
        </button>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold text-navy">Some fields are still uncertain</h2>
            <p className="mt-2 text-sm text-slate-500">
              Uncertain values will not be treated as verified unless you confirm them now.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="min-h-12 rounded-2xl bg-slate-100 text-sm font-medium" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </button>
              <button
                type="button"
                className="min-h-12 rounded-2xl bg-navy text-sm font-semibold text-white"
                onClick={() => {
                  setConfirmOpen(false);
                  void persist(true);
                }}
              >
                Confirm anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  confidence,
  children,
}: {
  label: string;
  confidence: ConfidenceLevel;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-sm font-medium text-navy">
        {label}
        <ConfidenceBadge level={confidence} />
      </span>
      {children}
    </label>
  );
}
