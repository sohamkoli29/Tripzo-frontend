"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import ToastContainer   from "@/components/notifications/ToastNotification";

export default function DashboardLayout({ children }) {
  const supabase = createClient();
  const router   = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/sign-in");
      else setUser(user);
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
      <Sidebar user={user} />

      <main className="flex-1 ml-64 min-h-screen">
        {/* Top bar with notification bell */}
        <div className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800 px-8 py-3 flex items-center justify-end">
          <NotificationBell />
        </div>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>

      {/* Global toast container */}
      <ToastContainer />
    </div>
  );
}