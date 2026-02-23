"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatCard from "@/components/dashboard/StatCard";
import RecentRides from "@/components/dashboard/RecentRides";
import Link from "next/link";

export default function DashboardPage() {
  const [rides, setRides]     = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

useEffect(() => {
  const fetchData = async () => {
    try {
      // Fetch rides and profile independently so one failure doesn't break both
      const ridesData = await api.getRides().catch(() => []);
      const profileData = await api.getProfile().catch(() => null);

      setRides(ridesData || []);
      setProfile(profileData);
    } catch (err) {
      setError("Failed to load dashboard data.");
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);

  const completedRides  = rides.filter((r) => r.status === "completed");
  const cancelledRides  = rides.filter((r) => r.status === "cancelled").length;
  const activeRide      = rides.find((r) => ["requested", "accepted", "in_progress"].includes(r.status));
  const totalSpent      = completedRides
    .reduce((sum, r) => sum + parseFloat(r.fare || 0), 0)
    .toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">🚖 Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {profile?.full_name || "Rider"} 👋
          </h1>
          <p className="text-gray-400 mt-1">Here's your activity overview</p>
        </div>
        <Link
          href="/dashboard/book"
          className="bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm"
        >
          + Book a Ride
        </Link>
      </div>

      {/* Active Ride Banner */}
      {activeRide && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚖</span>
            <div>
              <p className="text-yellow-400 font-semibold">You have an active ride!</p>
              <p className="text-gray-400 text-sm mt-0.5">
                {activeRide.pickup_address} → {activeRide.dropoff_address}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/rides/${activeRide.id}`}
            className="bg-yellow-400 text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 transition"
          >
            Track Ride
          </Link>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          ❌ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon="🚖"
          label="Total Rides"
          value={rides.length}
          sub="All time"
          color="yellow"
        />
        <StatCard
          icon="✅"
          label="Completed"
          value={completedRides.length}
          sub="Successfully finished"
          color="green"
        />
        <StatCard
          icon="💳"
          label="Total Spent"
          value={`$${totalSpent}`}
          sub="Across all rides"
          color="blue"
        />
        <StatCard
          icon="❌"
          label="Cancelled"
          value={cancelledRides}
          sub="Cancelled rides"
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "🚖",
              label: "Book a Ride",
              desc: "Request a new ride",
              href: "/dashboard/book",
              primary: true,
            },
            {
              icon: "🗺️",
              label: "My Rides",
              desc: "View ride history",
              href: "/dashboard/rides",
              primary: false,
            },
            {
              icon: "👤",
              label: "Edit Profile",
              desc: "Update your info",
              href: "/dashboard/profile",
              primary: false,
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`flex items-center gap-4 px-6 py-5 rounded-2xl font-semibold transition-all duration-200
                ${action.primary
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-gray-900 text-white border border-gray-800 hover:border-yellow-400/50 hover:bg-gray-800"
                }`}
            >
              <span className="text-3xl">{action.icon}</span>
              <div>
                <p className="font-bold">{action.label}</p>
                <p className={`text-xs mt-0.5 ${action.primary ? "text-black/60" : "text-gray-500"}`}>
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Rides */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Recent Rides</h2>
          <Link
            href="/dashboard/rides"
            className="text-yellow-400 text-sm hover:underline"
          >
            View all →
          </Link>
        </div>
        <RecentRides rides={rides.slice(0, 5)} />
      </div>

    </div>
  );
}