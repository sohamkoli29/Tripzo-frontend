"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

const statusConfig = {
  requested:   { label: "Finding Driver", badge: "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20" },
  accepted:    { label: "Driver Assigned", badge: "bg-blue-400/10   text-blue-400   border border-blue-400/20"   },
  in_progress: { label: "In Progress",    badge: "bg-purple-400/10 text-purple-400 border border-purple-400/20" },
  completed:   { label: "Completed",      badge: "bg-green-400/10  text-green-400  border border-green-400/20"  },
  cancelled:   { label: "Cancelled",      badge: "bg-red-400/10    text-red-400    border border-red-400/20"    },
};

const rideTypeIcons = { standard: "🚖", premium: "🚘", xl: "🚐" };

export default function MyRidesPage() {
  const [rides,           setRides]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [filter,          setFilter]          = useState("all");
  const [paymentStatuses, setPaymentStatuses] = useState({});

  useEffect(() => {
    const init = async () => {
      try {
        const data = await api.getRides();
        setRides(data || []);

        // Fetch payment status for completed rides in parallel
        const completed = (data || []).filter((r) => r.status === "completed");
        const results   = await Promise.all(
          completed.map(async (r) => {
            try {
              const ps = await api.getPaymentStatus(r.id);
              return { id: r.id, status: ps.status };
            } catch {
              return { id: r.id, status: "unpaid" };
            }
          })
        );
        const map = {};
        results.forEach(({ id, status }) => { map[id] = status; });
        setPaymentStatuses(map);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const FILTERS = [
    { key: "all",       label: "All Rides"  },
    { key: "active",    label: "Active"     },
    { key: "completed", label: "Completed"  },
    { key: "cancelled", label: "Cancelled"  },
  ];

  const filteredRides = rides.filter((r) => {
    if (filter === "active")    return ["requested", "accepted", "in_progress"].includes(r.status);
    if (filter === "completed") return r.status === "completed";
    if (filter === "cancelled") return r.status === "cancelled";
    return true;
  });

  const totalSpent = rides
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + parseFloat(r.fare || 0), 0)
    .toFixed(2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading rides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Rides</h1>
          <p className="text-gray-400 mt-1">{rides.length} total ride{rides.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/dashboard/book"
          className="bg-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm"
        >
          + Book Ride
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",     value: rides.length,                                                                            color: "text-white"        },
          { label: "Active",    value: rides.filter(r => ["requested","accepted","in_progress"].includes(r.status)).length,     color: "text-yellow-400"   },
          { label: "Completed", value: rides.filter(r => r.status === "completed").length,                                      color: "text-green-400"    },
          { label: "Spent",     value: "₹" + totalSpent,                                                                        color: "text-blue-400"     },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={s.color + " text-xl font-bold"}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "px-4 py-2 rounded-xl text-sm font-medium transition " +
              (filter === f.key
                ? "bg-yellow-400 text-black"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white"
              )
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rides List */}
      {filteredRides.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="text-white font-semibold">No rides found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === "all" ? "Book your first ride to get started" : "No " + filter + " rides yet"}
          </p>
          {filter === "all" && (
            <Link
              href="/dashboard/book"
              className="inline-block mt-4 bg-yellow-400 text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm"
            >
              Book a Ride
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRides.map((ride) => {
            const st       = statusConfig[ride.status] || statusConfig.requested;
            const pStatus  = paymentStatuses[ride.id];
            const isPaid   = pStatus === "completed" || pStatus === "cash";
            const isActive = ["requested", "accepted", "in_progress"].includes(ride.status);

            return (
              <div
                key={ride.id}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 transition"
              >
                {/* Route */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 items-start flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1 mt-1.5 flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <div className="w-0.5 h-7 bg-gray-700" />
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="text-gray-500 text-xs">Pickup</p>
                        <p className="text-white text-sm truncate">{ride.pickup_address}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Dropoff</p>
                        <p className="text-white text-sm truncate">{ride.dropoff_address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status + Fare */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={"text-xs px-2.5 py-1 rounded-full font-medium " + st.badge}>
                      {st.label}
                    </span>
                    <p className="text-white font-bold text-lg">₹{parseFloat(ride.fare).toFixed(2)}</p>
                    <p className="text-gray-600 text-xs capitalize">
                      {rideTypeIcons[ride.ride_type] || "🚖"} {ride.ride_type}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800 gap-2 flex-wrap">
                  <p className="text-gray-600 text-xs">
                    {new Date(ride.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {" · "}{ride.distance_km} km · ~{ride.duration_mins} min
                  </p>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Pay Now */}
                    {ride.status === "completed" && !isPaid && (
                      <Link
                        href={"/dashboard/checkout/" + ride.id}
                        className="bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition"
                      >
                        💳 Pay Now
                      </Link>
                    )}

                    {/* Paid badge */}
                    {isPaid && (
                      <span className="bg-green-400/10 text-green-400 border border-green-400/20 text-xs font-medium px-3 py-1.5 rounded-lg">
                        {pStatus === "cash" ? "💵 Cash Paid" : "✅ Paid"}
                      </span>
                    )}

                    <Link
                      href={"/dashboard/rides/" + ride.id}
                      className="bg-gray-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
                    >
                      {isActive ? "Track →" : "View →"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}