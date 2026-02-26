"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

const rideTypeConfig = {
  standard: { icon: "🚖", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  premium:  { icon: "🚘", color: "text-blue-400",   bg: "bg-blue-400/10"   },
  xl:       { icon: "🚐", color: "text-purple-400", bg: "bg-purple-400/10" },
};

export default function AvailableRideCard({ ride, onAccepted }) {
  const router    = useRouter();
  const [loading, setLoading] = useState(false);
  const config    = rideTypeConfig[ride.ride_type] || rideTypeConfig.standard;

  const handleAccept = async () => {
    setLoading(true);
    try {
      await api.updateRideStatus(ride.id, "accepted");
      onAccepted?.(ride.id);
      router.push(`/dashboard/driver/rides/${ride.id}`);
    } catch (err) {
      alert("Failed to accept ride: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5
                    hover:border-yellow-400/30 transition-all duration-200">

      {/* Top Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${config.bg}`}>
            {config.icon}
          </div>
          <div>
            <p className={`text-sm font-semibold capitalize ${config.color}`}>
              {ride.ride_type} Ride
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {new Date(ride.created_at).toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold text-xl">  ₹{ride.fare}</p>
          {ride.distance_from_driver != null && (
            <p className="text-gray-500 text-xs mt-0.5">
              {ride.distance_from_driver.toFixed(1)} km away
            </p>
          )}
        </div>
      </div>

      {/* Route */}
      <div className="flex gap-3 items-start mb-4">
        <div className="flex flex-col items-center gap-1 mt-1.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <div className="w-0.5 h-8 bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
        </div>
        <div className="flex-1 space-y-3 min-w-0">
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

      {/* Stats Row */}
      <div className="flex gap-2 mb-4">
        {[
          { icon: "📍", label: `${ride.distance_km} km` },
          { icon: "⏱️",  label: `~${ride.duration_mins} min` },
        ].map((item) => (
          <div key={item.label}
            className="flex-1 bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-sm">{item.icon}</span>
            <span className="text-gray-300 text-xs font-medium">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Accept Button */}
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl
                   hover:bg-yellow-300 transition-all disabled:opacity-50
                   disabled:cursor-not-allowed"
      >
        {loading ? "Accepting..." : "Accept Ride"}
      </button>

    </div>
  );
}