import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function Layout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto min-h-dvh max-w-lg pb-24">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
