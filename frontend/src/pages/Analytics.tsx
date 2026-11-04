import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Logo } from "../components/Logo";
import { useBills } from "../hooks/useBills";
import { formatMoney } from "../utils/money";

const COLORS = ["#0B1F3A", "#1D4ED8", "#0F766E", "#CA8A04", "#DC2626", "#7C3AED", "#0369A1", "#64748B"];

export function AnalyticsPage() {
  const bills = useBills();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const monthly = useMemo(
    () =>
      bills.filter((bill) => {
        const key = (bill.date || bill.createdAt).slice(0, 7);
        return key === monthKey;
      }),
    [bills, monthKey],
  );

  const total = monthly.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const byCategory = Object.entries(
    monthly.reduce<Record<string, number>>((acc, bill) => {
      acc[bill.category] = (acc[bill.category] ?? 0) + bill.totalAmount;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const byDay = monthly.reduce<Record<string, number>>((acc, bill) => {
    const day = (bill.date || bill.createdAt).slice(0, 10);
    acc[day] = (acc[day] ?? 0) + bill.totalAmount;
    return acc;
  }, {});
  const chartRows = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date: date.slice(8), amount }));

  return (
    <main className="px-4 pb-6 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold text-navy">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Monthly totals from saved bills only. Nothing is estimated.</p>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <article className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">This month</p>
          <p className="mt-2 text-lg font-semibold text-navy">{formatMoney(total)}</p>
        </article>
        <article className="rounded-2xl bg-white p-4 shadow-card">
          <p className="text-xs text-slate-500">Transactions</p>
          <p className="mt-2 text-lg font-semibold text-navy">{monthly.length}</p>
        </article>
      </section>

      {monthly.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-card">
          Save bills this month to see spending charts.
        </p>
      ) : (
        <>
          <section className="mt-5 rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-navy">Daily spending</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                  <Bar dataKey="amount" fill="#0B1F3A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="mt-5 rounded-3xl bg-white p-4 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-navy">By category</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                    {byCategory.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatMoney(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {byCategory.map((row, index) => (
                <li key={row.name} className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                    {row.name}
                  </span>
                  <span>{formatMoney(row.value)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
