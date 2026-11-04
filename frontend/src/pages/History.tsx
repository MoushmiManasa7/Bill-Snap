import { useMemo, useState } from "react";
import { BillCard } from "../components/BillCard";
import { Logo } from "../components/Logo";
import { useBills } from "../hooks/useBills";
import { filterBills } from "../services/bills";
import { CATEGORIES, type ExpenseCategory } from "../types/bill";

export function HistoryPage() {
  const bills = useBills();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | "All">("All");
  const [sort, setSort] = useState<"newest" | "oldest" | "amount">("newest");

  const rows = useMemo(
    () => filterBills(bills, query, category, sort),
    [bills, query, category, sort],
  );

  return (
    <main className="px-4 pb-6 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold text-navy">History</h1>
      <p className="mt-1 text-sm text-slate-500">Search, filter, and reopen saved bills. Data stays on this device.</p>

      <div className="mt-4 space-y-3">
        <input
          type="search"
          placeholder="Search merchant"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory | "All")}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as "newest" | "oldest" | "amount")}
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="newest">Newest date</option>
            <option value="oldest">Oldest date</option>
            <option value="amount">Highest amount</option>
          </select>
        </div>
      </div>

      <section className="mt-5 space-y-3">
        {rows.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-card">No saved bills match these filters.</p>
        ) : (
          rows.map((bill) => <BillCard key={bill.id} bill={bill} />)
        )}
      </section>
    </main>
  );
}
