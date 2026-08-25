import { NavLink } from "react-router-dom";

// Slim left rail: brand mark, nav items, no footer clutter.
// Only two destinations because the DB only supports two.
export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-line bg-card">
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-ink flex items-center justify-center text-white text-[11px] font-bold tracking-wide">
          QC
        </div>
        <span className="text-[15px] font-semibold text-ink">Evaluator</span>
      </div>

      <nav className="mt-2 px-3 flex-1">
        <NavItem to="/" label="Run evaluation" icon={PlayIcon} end />
        <NavItem to="/evaluations" label="Evaluations" icon={ListIcon} />
      </nav>
    </aside>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string;
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
          isActive
            ? "bg-coral-bg text-coral-text font-medium"
            : "text-muted hover:bg-paper hover:text-ink"
        }`
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}
