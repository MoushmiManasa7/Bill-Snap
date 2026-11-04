import { useEffect, useState } from "react";
import { listBills } from "../services/bills";
import type { SavedBill } from "../types/bill";

const listeners = new Set<() => void>();

export function notifyBillsChanged(): void {
  listeners.forEach((listener) => listener());
}

export function useBills(): SavedBill[] {
  const [bills, setBills] = useState<SavedBill[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await listBills();
        if (active) setBills(rows);
      } catch {
        if (active) setBills([]);
      }
    };
    load();
    listeners.add(load);
    return () => {
      active = false;
      listeners.delete(load);
    };
  }, []);

  return bills;
}

export function useBill(id: string | undefined): SavedBill | undefined {
  const bills = useBills();
  return bills.find((bill) => bill.id === id);
}
