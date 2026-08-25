import { NavLink } from "react-router-dom";

// Left rail navigation. Two real destinations only — Run and Evaluations —
// so we don't invent Coach/Client/Program surfaces the DB can't populate.
export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-line bg-card">
      <div className="px-5 py-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-coral to-strong flex items-center justify-center text-white text-xs font-bold">
          CE
        </div>
        <div>
          <div className="text-sm font-semibold text-ink leading-none">Call Eval</div>
          <div className="mt-1 text-[10px] uppercase tracking-widest text-muted">
            evidence-first
          </div>
        </div>
      </div>

      <nav className="mt-2 px-3 flex-1">
        <NavItem to="/" label="Run evaluation" icon={PlayIcon} end />
        <NavItem to="/evaluations" label="Evaluations" icon={ListIcon} />
      </nav>

      <div className="px-5 py-4 text-[10px] text-muted border-t border-line">
        Every score traces back to a literal quote.
      </div>
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
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4l14 8-14 8V4z" strokeLinejoin="round" />
    </svg>
  );
}
function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
    </svg>
  );
}
