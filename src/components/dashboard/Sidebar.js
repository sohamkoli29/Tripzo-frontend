"use client";

import Link        from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api }     from "@/lib/api";
import { useEffect, useState } from "react";

const riderNav = [
  { label: "Dashboard",   href: "/dashboard",          icon: "🏠" },
  { label: "Book a Ride", href: "/dashboard/book",     icon: "🚖" },
  { label: "My Rides",    href: "/dashboard/rides",    icon: "🗺️"  },
  { label: "Payments",    href: "/dashboard/payments", icon: "💳" },
  { label: "Profile",     href: "/dashboard/profile",  icon: "👤" },
];

const driverNav = [
  { label: "Dashboard",        href: "/dashboard",         icon: "🏠" },
  { label: "Driver Dashboard", href: "/dashboard/driver",  icon: "🚗" },
  { label: "Book a Ride",      href: "/dashboard/book",    icon: "🚖" },
  { label: "My Rides",         href: "/dashboard/rides",   icon: "🗺️"  },
  { label: "Payments",         href: "/dashboard/payments",icon: "💳" },
  { label: "Profile",          href: "/dashboard/profile", icon: "👤" },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const [profilePic, setProfilePic] = useState(null);
  const [fullName,   setFullName]   = useState("");
  const [role,       setRole]       = useState("rider");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await api.getProfile();
        if (data?.profile_picture) setProfilePic(data.profile_picture);
        if (data?.full_name)       setFullName(data.full_name);
        if (data?.role)            setRole(data.role);
      } catch {}
    };
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  const navItems = role === "driver" ? driverNav : riderNav;

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">

      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚖</span>
          <h1 className="text-2xl font-bold text-yellow-400">Tripzo</h1>
        </div>
        <p className="text-gray-500 text-xs mt-1 ml-0.5">Your ride, your way</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-yellow-400 overflow-hidden flex items-center justify-center text-black font-bold text-lg flex-shrink-0">
          {profilePic ? (
            <img src={profilePic} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            user?.email?.[0]?.toUpperCase() || "U"
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-white text-sm font-medium truncate">
            {fullName || user?.email || "User"}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs">{role === "driver" ? "🚗" : "🧑"}</span>
            <p className="text-gray-500 text-xs capitalize">{role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 " +
                (isActive
                  ? "bg-yellow-400 text-black"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Role Badge */}
      <div className="px-4 pb-2">
        <div className={
          "rounded-xl px-4 py-3 text-xs font-medium text-center " +
          (role === "driver"
            ? "bg-green-400/10 text-green-400 border border-green-400/20"
            : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
          )
        }>
          {role === "driver" ? "🚗 Tripzo Driver" : "🧑 Tripzo Rider"}
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <span className="text-lg">🚪</span>
          Sign Out
        </button>
      </div>

    </aside>
  );
}