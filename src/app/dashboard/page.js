"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatCard    from "@/components/dashboard/StatCard";
import RecentRides from "@/components/dashboard/RecentRides";
import Link        from "next/link";

export default function DashboardPage() {
  const [rides,           setRides]           = useState([]);
  const [profile,         setProfile]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState("");
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [becomingDriver,  setBecomingDriver]  = useState(false);
  const [driverSuccess,   setDriverSuccess]   = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ridesData, profileData] = await Promise.all([
          api.getRides().catch(() => []),
          api.getProfile().catch(() => null),
        ]);
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

  const handleBecomeDriver = async () => {
    setBecomingDriver(true);
    try {
      await api.updateProfile({ role: "driver" });
      setProfile((prev) => ({ ...prev, role: "driver" }));
      setDriverSuccess(true);
      setTimeout(() => {
        setShowDriverModal(false);
        setDriverSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to update role:", err.message);
    } finally {
      setBecomingDriver(false);
    }
  };

  const completedRides = rides.filter((r) => r.status === "completed");
  const cancelledRides = rides.filter((r) => r.status === "cancelled").length;
  const activeRide     = rides.find((r) =>
    ["requested", "accepted", "in_progress"].includes(r.status)
  );
  const totalSpent = completedRides
    .reduce((sum, r) => sum + parseFloat(r.fare || 0), 0)
    .toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">
          Loading dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Become Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md space-y-6">

            {driverSuccess ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-5xl">🎉</p>
                <p className="text-white font-bold text-xl">
                  Welcome to Tripzo Drivers!
                </p>
                <p className="text-gray-400 text-sm">
                  Your account has been upgraded. Head to the Driver Dashboard to start earning.
                </p>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="text-center">
                  <p className="text-5xl mb-3">🚗</p>
                  <h3 className="text-white font-bold text-2xl">
                    Become a Tripzo Driver
                  </h3>
                  <p className="text-gray-400 text-sm mt-2">
                    Join thousands of drivers earning on their own schedule
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3">
                  {[
                    { icon: "💰", title: "Earn More",        desc: "Set your own hours and maximize your income"        },
                    { icon: "🗺️",  title: "Drive Anywhere",  desc: "Accept rides in your city on your terms"            },
                    { icon: "⚡", title: "Instant Payouts",  desc: "Get paid quickly after every completed ride"        },
                    { icon: "🛡️",  title: "Full Support",    desc: "24/7 driver support whenever you need help"         },
                  ].map((b) => (
                    <div key={b.title} className="flex items-start gap-3 bg-gray-800 rounded-xl p-4">
                      <span className="text-2xl flex-shrink-0">{b.icon}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{b.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warning */}
                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4">
                  <p className="text-yellow-400 text-xs">
                    By continuing, your account role will be switched to Driver.
                    You can still book rides as a passenger from the dashboard.
                  </p>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowDriverModal(false)}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={handleBecomeDriver}
                    disabled={becomingDriver}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-3 rounded-xl transition disabled:opacity-50"
                  >
                    {becomingDriver ? "Upgrading..." : "Yes, Become a Driver"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {profile?.full_name || "Rider"} 👋
          </h1>
          <p className="text-gray-400 mt-1">Here is your activity overview</p>
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
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚖</span>
            <div>
              <p className="text-yellow-400 font-semibold">You have an active ride!</p>
              <p className="text-gray-400 text-sm mt-0.5 truncate max-w-xs">
                {activeRide.pickup_address} to {activeRide.dropoff_address}
              </p>
            </div>
          </div>
          <Link
            href={"/dashboard/rides/" + activeRide.id}
            className="flex-shrink-0 bg-yellow-400 text-black text-sm font-bold px-4 py-2 rounded-xl hover:bg-yellow-300 transition"
          >
            Track Ride
          </Link>
        </div>
      )}

      {/* Become a Tripzo Driver Banner — only for riders */}
      {profile?.role === "rider" && (
        <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-2xl p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">🚗</span>
            <div>
              <p className="text-white font-bold text-lg">Become a Tripzo Driver</p>
              <p className="text-gray-400 text-sm mt-0.5">
                Earn money on your schedule. Switch to driver mode anytime.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDriverModal(true)}
            className="flex-shrink-0 bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm whitespace-nowrap"
          >
            Become a Driver
          </button>
        </div>
      )}

      {/* Driver Mode Active Banner */}
      {profile?.role === "driver" && (
        <div className="bg-green-400/10 border border-green-400/30 rounded-2xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🚗</span>
            <div>
              <p className="text-green-400 font-bold">Tripzo Driver Mode Active</p>
              <p className="text-gray-400 text-sm mt-0.5">
                Head to your Driver Dashboard to start accepting rides
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/driver"
            className="flex-shrink-0 bg-green-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-green-300 transition text-sm whitespace-nowrap"
          >
            Go to Driver Dashboard
          </Link>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="🚖" label="Total Rides"  value={rides.length}           sub="All time"              color="yellow" />
        <StatCard icon="✅" label="Completed"    value={completedRides.length}  sub="Successfully finished" color="green"  />
        <StatCard icon="💳" label="Total Spent"  value={"₹" + totalSpent}       sub="Across all rides"      color="blue"   />
        <StatCard icon="❌" label="Cancelled"    value={cancelledRides}         sub="Cancelled rides"       color="red"    />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-white font-semibold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: "🚖", label: "Book a Ride",  desc: "Request a new ride",   href: "/dashboard/book",    primary: true  },
            { icon: "🗺️",  label: "My Rides",    desc: "View ride history",    href: "/dashboard/rides",   primary: false },
            { icon: "👤", label: "Edit Profile", desc: "Update your info",     href: "/dashboard/profile", primary: false },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                "flex items-center gap-4 px-6 py-5 rounded-2xl font-semibold transition-all duration-200 " +
                (action.primary
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-gray-900 text-white border border-gray-800 hover:border-yellow-400/50 hover:bg-gray-800"
                )
              }
            >
              <span className="text-3xl">{action.icon}</span>
              <div>
                <p className="font-bold">{action.label}</p>
                <p className={"text-xs mt-0.5 " + (action.primary ? "text-black/60" : "text-gray-500")}>
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
          <Link href="/dashboard/rides" className="text-yellow-400 text-sm hover:underline">
            View all
          </Link>
        </div>
        <RecentRides rides={rides.slice(0, 5)} />
      </div>

    </div>
  );
}