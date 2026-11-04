import Dexie, { type Table } from "dexie";
import type { SavedBill } from "../types/bill";

class BillSnapDatabase extends Dexie {
  bills!: Table<SavedBill, string>;

  constructor() {
    super("bill-snap");
    this.version(1).stores({
      bills: "id, merchant, date, category, createdAt, duplicateHash",
    });
  }
}

export const db = new BillSnapDatabase();
