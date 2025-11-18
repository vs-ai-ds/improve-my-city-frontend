// File: src/components/layout/Header.tsx
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { FilePlus2, Home, ChevronDown, LogOut, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../store/useAuth";
import AuthModal from "../auth/AuthModal";
import ReportModal from "../report/ReportModal";
import { useReportModal } from "../../store/useReportModal";

const linkBase = "rounded-xl px-3 py-2 text-sm transition cursor-pointer";
const linkIdle = "text-gray-700 hover:text-blue-800 hover:bg-blue-50";
const linkActive = "text-blue-900 bg-blue-100";

function Avatar({ name, email }: { name?: string | null; email: string }) {
  const text = (name || email || "?").trim();
  const parts = text.split(" ").filter(Boolean);
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : text[0];
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white grid place-items-center text-xs font-bold">
      {initials?.toUpperCase()}
    </div>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const isLoggedIn = !!user;
  const isTeam = !!user && ["staff", "admin", "super_admin"].includes(user.role);
  const [openAuth, setOpenAuth] = useState<false | "login" | "register" | "forgot">(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Use the modal store consistently
  const { openWith, close, isOpen } = useReportModal();

  function onReportClick() {
    if (isLoggedIn) openWith?.(); // open global report modal
    else setOpenAuth("login");
  }

  // Click-away to close profile menu
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenu(false);
    }
    if (menu) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  useEffect(() => {
    function onOpenAuth(e: any) { setOpenAuth(e?.detail?.view || "login"); }
    window.addEventListener("imc:open-auth", onOpenAuth);
    return () => window.removeEventListener("imc:open-auth", onOpenAuth);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 sm:gap-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow" />
            <motion.span initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="font-bold tracking-tight text-sm sm:text-base">
              <span className="hidden sm:inline">Improve</span><span className="sm:hidden">IMC</span><span className="text-indigo-600">My</span>City
            </motion.span>
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            <NavLink to="/" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
              <span className="inline-flex items-center gap-1"><Home className="h-4 w-4" /> <span className="hidden sm:inline">Home</span></span>
            </NavLink>

            {isTeam && (
              <NavLink to="/admin" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
                <span className="inline-flex items-center gap-1"><LayoutDashboard className="h-4 w-4" /> <span className="hidden sm:inline">Admin</span></span>
              </NavLink>
            )}

            <button onClick={onReportClick} className={`${linkBase} ${linkIdle}`}>
              <span className="inline-flex items-center gap-1"><FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">Report</span></span>
            </button>

            {!isLoggedIn ? (
              <div className="ml-2">
                <button
                  onClick={() => setOpenAuth("login")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-white text-sm font-medium shadow hover:bg-indigo-700"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <div className="relative ml-2" ref={menuRef}>
                <button onClick={() => setMenu((v) => !v)} className="inline-flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100">
                  <Avatar name={user?.name} email={user!.email} />
                  <div className="hidden sm:block text-sm text-gray-800 max-w-[140px] truncate">{user?.name || user?.email}</div>
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg ring-1 ring-black/5 p-1">
                    <NavLink to="/profile" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Profile</NavLink>
                    {isTeam && <NavLink to="/admin" className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Admin Console</NavLink>}
                    <button
                      onClick={() => { setMenu(false); logout(); }}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-gray-50 text-red-700 inline-flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Mount modals here */}
      <AuthModal open={!!openAuth} initialView={openAuth || "login"} onClose={() => setOpenAuth(false)} />
      <ReportModal open={isOpen} onClose={close} />
    </>
  );
}