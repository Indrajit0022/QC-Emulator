import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

function loadCollapsed(): boolean {
  try { return localStorage.getItem("qc-sidebar-collapsed") === "true"; } catch { return false; }
}
function saveCollapsed(v: boolean) {
  try { localStorage.setItem("qc-sidebar-collapsed", String(v)); } catch { /* noop */ }
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => { saveCollapsed(collapsed); }, [collapsed]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(search.trim() ? `/evaluations?q=${encodeURIComponent(search.trim())}` : "/evaluations");
    setMobileOpen(false);
  }

  function handleNavClick() { setMobileOpen(false); }

  const navContent = (
    <>
      {/* Brand */}
      <div className={`flex items-center border-b border-line/50 dark:border-dark-line/50 h-14
        ${collapsed && !mobileOpen ? "justify-center px-0" : "px-4 justify-between"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-coral to-[#c43939] flex items-center justify-center text-white text-[11px] font-bold tracking-wide shrink-0 shadow-sm">
            QC
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-[14px] font-semibold text-ink dark:text-dark-ink truncate">
              Evaluator
            </span>
          )}
        </div>
        {!mobileOpen && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`
              h-7 w-7 rounded-lg flex items-center justify-center
              text-muted hover:text-ink dark:text-dark-muted dark:hover:text-dark-ink
              hover:bg-paper/80 dark:hover:bg-dark-surface/80 transition-colors shrink-0
              ${collapsed ? "absolute left-[14px] top-[54px] z-10 glass-card shadow-sm" : ""}
            `}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
        )}
      </div>

      {/* Search (expanded/mobile) */}
      {(!collapsed || mobileOpen) && (
        <div className="px-3 pt-3 pb-1">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted dark:text-dark-muted pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search evaluations…"
                className="
                  w-full pl-8 pr-3 py-1.5 text-xs rounded-xl
                  bg-paper/60 dark:bg-dark-surface/60
                  border border-line/60 dark:border-dark-line/60
                  text-ink dark:text-dark-ink
                  placeholder:text-muted dark:placeholder:text-dark-muted
                  focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral/40
                  transition-all
                "
              />
            </div>
          </form>
        </div>
      )}

      {/* Nav */}
      <nav className={`mt-2 flex-1 ${collapsed && !mobileOpen ? "px-1.5" : "px-3"}`}>
        <NavItem to="/" label="Run evaluation" icon={PlayIcon} collapsed={collapsed && !mobileOpen} end onClick={handleNavClick} />
        <NavItem to="/evaluations" label="Evaluations" icon={ListIcon} collapsed={collapsed && !mobileOpen} onClick={handleNavClick} />
      </nav>

      {/* Theme toggle */}
      <div className={`border-t border-line/50 dark:border-dark-line/50 py-3 ${collapsed && !mobileOpen ? "px-1.5" : "px-3"}`}>
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
            text-muted dark:text-dark-muted
            hover:bg-paper/80 dark:hover:bg-dark-surface/80 hover:text-ink dark:hover:text-dark-ink
            ${collapsed && !mobileOpen ? "justify-center px-0" : ""}
          `}
        >
          {isDark ? <SunIcon className="h-4 w-4 shrink-0" /> : <MoonIcon className="h-4 w-4 shrink-0" />}
          {(!collapsed || mobileOpen) && (
            <span className="text-xs font-medium">
              {isDark ? "Light mode" : "Dark mode"}
            </span>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`
          hidden md:flex flex-col shrink-0 border-r border-line/40 dark:border-dark-line/40
          glass-sidebar sidebar-transition overflow-hidden
          ${collapsed ? "w-[60px]" : "w-60"}
        `}
      >
        {navContent}
      </aside>

      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 flex items-center px-4 gap-3 glass-sidebar border-b border-line/40 dark:border-dark-line/40">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-ink dark:text-dark-ink hover:bg-line/30 dark:hover:bg-dark-line/30"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-coral to-[#c43939] flex items-center justify-center text-white text-[10px] font-bold">
          QC
        </div>
        <span className="text-sm font-semibold text-ink dark:text-dark-ink">Evaluator</span>

        <div className="ml-auto">
          <button
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted dark:text-dark-muted hover:text-ink dark:hover:text-dark-ink"
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-ink/30 dark:bg-black/50 mobile-overlay"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col glass-sidebar border-r border-line/40 dark:border-dark-line/40 shadow-xl slide-in-left">
            {navContent}
          </aside>
        </>
      )}
    </>
  );
}

function NavItem({
  to, label, icon: Icon, end, collapsed, onClick,
}: {
  to: string;
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  end?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 py-2.5 rounded-xl text-sm mb-1 transition-all
        ${collapsed ? "justify-center px-0 w-full" : "px-3"}
        ${isActive
          ? "bg-coral/10 dark:bg-coral/10 text-coral dark:text-dark-coral-text font-medium shadow-sm"
          : "text-muted dark:text-dark-muted hover:bg-paper/80 dark:hover:bg-dark-surface/80 hover:text-ink dark:hover:text-dark-ink"
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </NavLink>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {collapsed
        ? <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
        : <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      }
    </svg>
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

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  );
}
