"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/booking/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-900 rounded-2xl flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">Loading map...</p>
    </div>
  ),
});

const statusConfig = {
  requested:   { label: "Finding Driver...", icon: "🔍", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30"  },
  accepted:    { label: "Driver Assigned",   icon: "✅", color: "text-blue-400",   bg: "bg-blue-400/10   border-blue-400/30"   },
  in_progress: { label: "Ride In Progress",  icon: "🚖", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  completed:   { label: "Ride Completed",    icon: "🎉", color: "text-green-400",  bg: "bg-green-400/10  border-green-400/30"  },
  cancelled:   { label: "Ride Cancelled",    icon: "❌", color: "text-red-400",    bg: "bg-red-400/10    border-red-400/30"    },
};

const CANCELLABLE_STATUSES = ["requested", "accepted"];

export default function RideDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [ride,        setRide]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [cancelling,  setCancelling]  = useState(false);
  const [error,       setError]       = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);

  // Initial fetch
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
  }, [id]);

  // Realtime subscription — replaces polling interval
  useRideRealtime({
    rideId: id,
    onStatusChange: (updatedRide) => {
      setRide(updatedRide);
    },
    onDriverLocationChange: (loc) => {
      setDriverLocation(loc);
    },
  });

  const handleCancel = async () => {
    setCancelling(true);
    setError("");
    setShowConfirm(false);

    try {
      const { ride: updated } = await api.updateRideStatus(id, "cancelled");
      setRide(updated);
    } catch (err) {
      setError("Failed to cancel ride: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const buildMapsUrl = () => {
    if (!ride) return "#";
    const parts = ["https://www.google.com/maps/dir/?api=1"];
    if (ride.dropoff_lat && ride.dropoff_lng) {
      parts.push("destination=" + ride.dropoff_lat + "," + ride.dropoff_lng);
    }
    return parts.join("&");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">
          Loading ride details...
        </p>
      </div>
    );
  }

  if (!ride) return null;

  const status    = statusConfig[ride.status] || statusConfig.requested;
  const canCancel = CANCELLABLE_STATUSES.includes(ride.status);
  const isActive  = ["requested", "accepted", "in_progress"].includes(ride.status);

  const pickup  = ride.pickup_lat && ride.pickup_lng
    ? { lat: ride.pickup_lat,  lng: ride.pickup_lng  }
    : null;
  const dropoff = ride.dropoff_lat && ride.dropoff_lng
    ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng }
    : null;

  // Show driver location on map if available, otherwise show route
  const mapPickup  = driverLocation || pickup;
  const mapDropoff = driverLocation ? dropoff : dropoff;

  const tripItems = [
    { label: "Fare",      value: "$" + ride.fare,                   icon: "💳" },
    { label: "Distance",  value: ride.distance_km + " km",          icon: "📍" },
    { label: "Duration",  value: "~" + ride.duration_mins + " min", icon: "⏱️" },
    { label: "Ride Type", value: ride.ride_type,                    icon: "🚖" },
  ];

  return (
    <div className="max-w-2xl space-y-6">

      {/* Cancel Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-white font-bold text-lg">Cancel This Ride?</h3>
              <p className="text-gray-400 text-sm mt-2">
                {ride.status === "accepted"
                  ? "A driver has already been assigned. Are you sure you want to cancel?"
                  : "Your ride request will be cancelled. Are you sure?"
                }
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition"
              >
                Keep Ride
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/rides"
          className="text-gray-400 hover:text-white transition text-sm"
        >
          Back to My Rides
        </Link>
        {canCancel && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={cancelling}
            className="text-red-400 hover:text-red-300 text-sm font-medium transition disabled:opacity-50"
          >
            Cancel Ride
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div className={"rounded-2xl border p-6 flex items-center gap-4 " + status.bg}>
        <span className="text-4xl">{status.icon}</span>
        <div className="flex-1">
          <p className={"text-xl font-bold " + status.color}>
            {status.label}
          </p>
          <p className="text-gray-400 text-sm mt-0.5">
            Ride ID: {ride.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        {/* Pulsing dot for active rides */}
        {ride.status === "requested" && (
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-60" />
          </div>
        )}
        {ride.status === "accepted" && (
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-60" />
          </div>
        )}
        {ride.status === "in_progress" && (
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-purple-400" />
            <div className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-60" />
          </div>
        )}
      </div>

      {/* Driver on the way banner */}
      {ride.status === "accepted" && (
        <div className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center text-2xl flex-shrink-0">
            🚗
          </div>
          <div>
            <p className="text-blue-400 font-semibold">Driver is on the way!</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Your driver has accepted the ride and is heading to pick you up.
            </p>
          </div>
        </div>
      )}

      {/* Live driver location notice */}
      {driverLocation && isActive && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-60" />
          </div>
          <p className="text-yellow-400 text-sm font-medium">
            Showing live driver location on map
          </p>
        </div>
      )}

      {/* Map */}
      {(pickup || dropoff) && (
        <div className="h-64 rounded-2xl overflow-hidden border border-gray-800">
          <MapView pickup={mapPickup} dropoff={mapDropoff} />
        </div>
      )}

      {/* Route Info */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Your Route</h2>
        <div className="flex gap-4 items-start mb-5">
          <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="w-0.5 h-10 bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Pickup</p>
              <p className="text-white text-sm mt-0.5">{ride.pickup_address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Dropoff</p>
              <p className="text-white text-sm mt-0.5">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>
        <a
          href={buildMapsUrl()}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition text-sm"
        >
          View in Google Maps
        </a>
      </div>

      {/* Trip Info Grid */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Trip Info</h2>
        <div className="grid grid-cols-2 gap-3">
          {tripItems.map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs">
                {item.icon} {item.label}
              </p>
              <p className="text-white font-semibold mt-1.5 capitalize">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pb-8">

        {/* Cancel button — only if ride hasn't started */}
        {canCancel && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={cancelling}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-500/20 transition disabled:opacity-50"
          >
            {cancelling ? "Cancelling ride..." : "Cancel Ride"}
          </button>
        )}

        {/* In progress — no cancel */}
        {ride.status === "in_progress" && (
          <div className="bg-purple-400/10 border border-purple-400/30 rounded-xl p-4 text-center">
            <p className="text-purple-400 font-semibold text-sm">
              Ride is in progress — cancellation not available
            </p>
          </div>
        )}

        {/* Completed — view receipt */}
        {ride.status === "completed" && (
          <Link
            href="/dashboard/payments"
            className="flex items-center justify-center w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 transition"
          >
            View Receipt
          </Link>
        )}

        {/* Cancelled — book new ride */}
        {ride.status === "cancelled" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center space-y-3">
            <p className="text-red-400 font-bold text-lg">Ride Cancelled</p>
            <p className="text-gray-400 text-sm">This ride has been cancelled.</p>
            <Link
              href="/dashboard/book"
              className="inline-block bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm"
            >
              Book a New Ride
            </Link>
          </div>
        )}

        <Link
          href="/dashboard"
          className="flex items-center justify-center w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition"
        >
          Back to Dashboard
        </Link>

      </div>
    </div>
  );
}