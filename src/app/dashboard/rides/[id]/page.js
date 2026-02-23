"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

const statusConfig = {
  requested:   { label: "Finding Driver...", icon: "🔍", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  accepted:    { label: "Driver Assigned",   icon: "✅", color: "text-blue-400",   bg: "bg-blue-400/10   border-blue-400/30"   },
  in_progress: { label: "Ride In Progress",  icon: "🚖", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  completed:   { label: "Ride Completed",    icon: "🎉", color: "text-green-400",  bg: "bg-green-400/10  border-green-400/30"  },
  cancelled:   { label: "Ride Cancelled",    icon: "❌", color: "text-red-400",    bg: "bg-red-400/10    border-red-400/30"    },
};

export default function RideDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();
  const [ride, setRide]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchRide = async () => {
      try {
        const data = await api.getRideById(id);
        setRide(data);
      } catch {
        router.push("/dashboard/rides");
      } finally {
        setLoading(false);
      }
    };

    fetchRide();

    // Poll for status updates every 5 seconds
    const interval = setInterval(fetchRide, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this ride?")) return;
    setCancelling(true);
    try {
      await api.updateRideStatus(id, "cancelled");
      setRide((prev) => ({ ...prev, status: "cancelled" }));
    } catch (err) {
      alert("Failed to cancel ride.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse">Loading ride details...</p>
      </div>
    );
  }

  if (!ride) return null;

  const status = statusConfig[ride.status] || statusConfig.requested;

  return (
    <div className="max-w-xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/rides" className="text-gray-400 hover:text-white transition">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Ride Details</h1>
      </div>

      {/* Status Banner */}
      <div className={`rounded-2xl border p-6 flex items-center gap-4 ${status.bg}`}>
        <span className="text-4xl">{status.icon}</span>
        <div>
          <p className={`text-xl font-bold ${status.color}`}>{status.label}</p>
          <p className="text-gray-400 text-sm mt-0.5">
            Ride ID: {ride.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Route Info */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <h2 className="text-white font-semibold">Route</h2>

        <div className="flex gap-4 items-start">
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="w-0.5 h-10 bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-gray-500 text-xs">Pickup</p>
              <p className="text-white text-sm mt-0.5">{ride.pickup_address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Dropoff</p>
              <p className="text-white text-sm mt-0.5">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ride Info Grid */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Trip Info</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Fare",      value: `$${ride.fare}`,              icon: "💳" },
            { label: "Distance",  value: `${ride.distance_km} km`,     icon: "📍" },
            { label: "Duration",  value: `~${ride.duration_mins} min`, icon: "⏱️"  },
            { label: "Ride Type", value: ride.ride_type,               icon: "🚖" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs">{item.icon} {item.label}</p>
              <p className="text-white font-semibold mt-1 capitalize">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {ride.status === "requested" && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-500/20 transition disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Ride"}
          </button>
        )}
        {ride.status === "completed" && (
          <Link
            href="/dashboard/payments"
            className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition text-center"
          >
            View Receipt 💳
          </Link>
        )}
        <Link
          href="/dashboard"
          className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition text-center"
        >
          Back to Dashboard
        </Link>
      </div>

    </div>
  );
}