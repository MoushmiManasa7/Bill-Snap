import { BarChart3, Camera, Clock3, House } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Home", icon: House, end: true },
  { to: "/scan", label: "Scan", icon: Camera, end: false },
  { to: "/history", label: "History", icon: Clock3, end: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, end: false },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-slate-200 bg-white/95 backdrop-blur"
      aria-label="Main"
    >
      <ul className="grid grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-medium ${
                    isActive ? "text-navy" : "text-slate-400"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
