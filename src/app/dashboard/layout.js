// frontend/src/app/dashboard/layout.js
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import ToastContainer   from "@/components/notifications/ToastNotification";

export default function DashboardLayout({ children }) {
  const router   = useRouter();
  const [user,       setUser]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      // ✅ getSession() — reads localStorage, no network call
      // Middleware already protects this route so we trust the session exists
      const { data: { session } } = await createClient().auth.getSession();
      if (!session?.user) {
        router.push("/sign-in");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-yellow-400 text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar user={user} mobileOpen={mobileOpen} onMobileToggle={setMobileOpen} />

      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-4 lg:px-8 py-3 flex items-center justify-between lg:justify-end gap-3">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-300 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo — mobile only */}
          <div className="lg:hidden flex items-center gap-2 flex-1">
            <span className="text-xl">🚖</span>
            <span className="text-lg font-bold text-yellow-400">Tripzo</span>
          </div>

          <NotificationBell />
        </div>

        {/* Page content */}
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}