// frontend/src/app/dashboard/driver/rides/[id]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
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
  accepted:    { label: "Ride Accepted",    icon: "✅", color: "text-blue-400",   bg: "bg-blue-400/10   border-blue-400/30"   },
  in_progress: { label: "Ride In Progress", icon: "🚖", color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  completed:   { label: "Ride Completed",   icon: "🎉", color: "text-green-400",  bg: "bg-green-400/10  border-green-400/30"  },
  cancelled:   { label: "Ride Cancelled",   icon: "❌", color: "text-red-400",    bg: "bg-red-400/10    border-red-400/30"    },
};

export default function DriverRideDetailPage() {
  const { id } = useParams();
  const router  = useRouter();

  const [ride,           setRide]           = useState(null);
  const [currentUserId,  setCurrentUserId]  = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [authError,      setAuthError]      = useState("");
  const [updating,       setUpdating]       = useState(false);
  const [cancelling,     setCancelling]     = useState(false);
  const [collectingCash, setCollectingCash] = useState(false);
  const [error,          setError]          = useState("");
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [showCashModal,  setShowCashModal]  = useState(false);
  const [paymentStatus,  setPaymentStatus]  = useState("unpaid");

  const loadRide = async (userId) => {
    try {
      const [rideData, ps] = await Promise.all([
        api.getRideById(id),
        api.getPaymentStatus(id).catch(() => ({ status: "unpaid" })),
      ]);

      // ── GUARD: make sure the logged-in user is actually the driver ──
      if (rideData.driver_id && rideData.driver_id !== userId) {
        setAuthError(
          "You are viewing this page as a rider, not the driver. " +
          "Switch to your driver account to manage this ride."
        );
      }

      setRide(rideData);
      setPaymentStatus(ps?.status || "unpaid");
    } catch {
      router.push("/dashboard/driver");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      // Get current logged-in user fresh from session
      const { data: { session } } = await createClient().auth.getSession();
      const uid = session?.user?.id;
      setCurrentUserId(uid);
      await loadRide(uid);
    })();

    const interval = setInterval(async () => {
      const uid = currentUserId;
      if (uid) await loadRide(uid);
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const isPaid = paymentStatus === "completed" || paymentStatus === "cash";

  // ── Check if current user is the driver of this ride ──
  const isDriver = ride && currentUserId && ride.driver_id === currentUserId;

  const handleStartRide = async () => {
    setUpdating(true);
    setError("");
    try {
      const { ride: updated } = await api.updateRideStatus(id, "in_progress");
      setRide(updated);
    } catch (err) {
      setError("Failed to start ride: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteRide = async () => {
    if (!isPaid) {
      setError("⚠️ Collect payment before completing. Use 'Collect Cash' or wait for rider to pay via app.");
      return;
    }
    setUpdating(true);
    setError("");
    try {
      const { ride: updated } = await api.updateRideStatus(id, "completed");
      setRide(updated);
      setTimeout(() => router.push("/dashboard/driver"), 2500);
    } catch (err) {
      setError("Failed to complete ride: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCashPayment = async () => {
    setCollectingCash(true);
    setError("");
    setShowCashModal(false);
    try {
      await api.collectCashPayment(id);
      setPaymentStatus("cash");
      const { ride: updated } = await api.updateRideStatus(id, "completed");
      setRide(updated);
      setTimeout(() => router.push("/dashboard/driver"), 2500);
    } catch (err) {
      setError("Failed to collect cash: " + err.message);
    } finally {
      setCollectingCash(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    setError("");
    setShowConfirm(false);
    try {
      const { ride: updated } = await api.updateRideStatus(id, "cancelled");
      setRide(updated);
      setTimeout(() => router.push("/dashboard/driver"), 2000);
    } catch (err) {
      setError("Failed to cancel: " + err.message);
    } finally {
      setCancelling(false);
    }
  };

  const buildMapsUrl = () => {
    const parts = ["https://www.google.com/maps/dir/?api=1"];
    if (ride?.pickup_lat  && ride?.pickup_lng)  parts.push("origin="      + ride.pickup_lat  + "," + ride.pickup_lng);
    if (ride?.dropoff_lat && ride?.dropoff_lng) parts.push("destination=" + ride.dropoff_lat + "," + ride.dropoff_lng);
    return parts.join("&");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading ride details...</p>
      </div>
    );
  }
  if (!ride) return null;

  const status   = statusConfig[ride.status] || statusConfig.accepted;
  const isActive = ride.status === "accepted" || ride.status === "in_progress";
  const pickup   = ride.pickup_lat  && ride.pickup_lng  ? { lat: ride.pickup_lat,  lng: ride.pickup_lng  } : null;
  const dropoff  = ride.dropoff_lat && ride.dropoff_lng ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng } : null;

  const tripItems = [
    { label: "Your Earnings", value: "₹" + parseFloat(ride.fare).toFixed(2), icon: "💰" },
    { label: "Distance",      value: ride.distance_km + " km",               icon: "📍" },
    { label: "Est. Duration", value: "~" + ride.duration_mins + " min",      icon: "⏱️" },
    { label: "Ride Type",     value: ride.ride_type,                         icon: "🚖" },
  ];

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Wrong account warning ────────────────────────── */}
      {authError && (
        <div className="bg-orange-500/10 border border-orange-500/40 rounded-2xl p-5 flex items-start gap-4">
          <span className="text-3xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-orange-400 font-bold">Wrong account</p>
            <p className="text-gray-400 text-sm mt-1">{authError}</p>
            <p className="text-gray-500 text-xs mt-2">
              Driver ID on ride: <span className="text-white font-mono text-xs">{ride.driver_id?.slice(0, 8)}</span>
              <br />
              Your ID: <span className="text-white font-mono text-xs">{currentUserId?.slice(0, 8)}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ─────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-white font-bold text-lg">Cancel This Ride?</h3>
              <p className="text-gray-400 text-sm mt-2">The rider will be notified. This cannot be undone.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">
                Keep Ride
              </button>
              <button onClick={handleCancel} disabled={cancelling}
                className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cash Modal ───────────────────────────────── */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5">
            <div className="text-center">
              <p className="text-5xl mb-3">💵</p>
              <h3 className="text-white font-bold text-xl">Collect Cash Payment</h3>
              <p className="text-gray-400 text-sm mt-2">Confirm you have received cash from the rider.</p>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fare Amount</span>
                <span className="text-yellow-400 font-bold text-lg">₹{parseFloat(ride.fare).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Payment Method</span>
                <span className="text-white font-medium">💵 Cash</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ride ID</span>
                <span className="text-white font-medium">{ride.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <p className="text-yellow-400/80 text-xs text-center">
              This will mark payment as collected and complete the ride.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCashModal(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">
                Cancel
              </button>
              <button onClick={handleCashPayment} disabled={collectingCash}
                className="bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {collectingCash ? "Confirming..." : "Cash Collected ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/driver" className="text-gray-400 hover:text-white transition text-sm">
          ← Back to Driver Dashboard
        </Link>
        {isActive && isDriver && (
          <button onClick={() => setShowConfirm(true)} disabled={cancelling}
            className="text-red-400 hover:text-red-300 text-sm font-medium transition disabled:opacity-50">
            Cancel Ride
          </button>
        )}
      </div>

      {/* Status Banner */}
      <div className={"rounded-2xl border p-6 flex items-center gap-4 " + status.bg}>
        <span className="text-4xl">{status.icon}</span>
        <div className="flex-1">
          <p className={"text-xl font-bold " + status.color}>{status.label}</p>
          <p className="text-gray-400 text-sm mt-0.5">Ride ID: {ride.id.slice(0, 8).toUpperCase()}</p>
        </div>
        {isActive && (
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-60" />
          </div>
        )}
      </div>

      {/* Payment status strip */}
      {ride.status === "in_progress" && (
        <div className={
          "rounded-xl border p-4 flex items-center gap-4 " +
          (isPaid ? "bg-green-400/10 border-green-400/30" : "bg-orange-400/10 border-orange-400/30")
        }>
          <span className="text-2xl">{isPaid ? "✅" : "⏳"}</span>
          <div className="flex-1">
            <p className={(isPaid ? "text-green-400" : "text-orange-400") + " font-semibold text-sm"}>
              {isPaid
                ? (paymentStatus === "cash" ? "Cash collected — ready to complete" : "Payment received via app — ready to complete")
                : "Awaiting payment — collect cash or wait for app payment"
              }
            </p>
            {!isPaid && (
              <p className="text-gray-500 text-xs mt-0.5">Fare: ₹{parseFloat(ride.fare).toFixed(2)}</p>
            )}
          </div>
        </div>
      )}

      {/* Map */}
      {(pickup || dropoff) && (
        <div className="h-64 rounded-2xl overflow-hidden border border-gray-800">
          <MapView pickup={pickup} dropoff={dropoff} />
        </div>
      )}

      {/* Route */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Rider Route</h2>
        <div className="flex gap-4 items-start mb-5">
          <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
            <div className="w-3 h-3 rounded-full bg-green-400" />
            <div className="w-0.5 h-10 bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <div className="flex-1 space-y-4 min-w-0">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Pick up rider at</p>
              <p className="text-white text-sm mt-0.5">{ride.pickup_address}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Drop off rider at</p>
              <p className="text-white text-sm mt-0.5">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>
        <a href={buildMapsUrl()} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition text-sm">
          Open Navigation in Google Maps
        </a>
      </div>

      {/* Trip Info */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-white font-semibold mb-4">Trip Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tripItems.map((item) => (
            <div key={item.label} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-500 text-xs">{item.icon} {item.label}</p>
              <p className="text-white font-semibold mt-1.5 capitalize">{item.value}</p>
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

      {/* ── Action Buttons — only shown to the actual driver ── */}
      <div className="space-y-3 pb-16 sm:pb-8">

        {/* Not the driver — show read-only message */}
        {!isDriver && ride.driver_id && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 text-center space-y-2">
            <p className="text-gray-400 text-sm">
              You are viewing this ride as a <span className="text-white font-semibold">rider</span>.
            </p>
            <p className="text-gray-500 text-xs">
              Sign in as the driver account to manage this ride.
            </p>
          </div>
        )}

        {/* ACCEPTED → Start Ride (driver only) */}
        {ride.status === "accepted" && isDriver && (
          <button onClick={handleStartRide} disabled={updating}
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 text-base">
            {updating ? "Starting..." : "🚀 Start Ride"}
          </button>
        )}

        {/* IN PROGRESS → Cash or Complete (driver only) */}
        {ride.status === "in_progress" && isDriver && (
          <>
            {!isPaid && (
              <button
                onClick={() => setShowCashModal(true)}
                disabled={collectingCash || updating}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 text-base"
              >
                💵 Collect Cash — ₹{parseFloat(ride.fare).toFixed(2)}
              </button>
            )}

            <button
              onClick={handleCompleteRide}
              disabled={updating || collectingCash || !isPaid}
              className={
                "w-full font-bold py-4 rounded-xl transition text-base " +
                (isPaid
                  ? "bg-green-500 hover:bg-green-400 text-white cursor-pointer"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                )
              }
            >
              {updating
                ? "Completing..."
                : isPaid
                  ? "✅ Complete Ride"
                  : "🔒 Complete Ride (collect payment first)"
              }
            </button>
          </>
        )}

        {/* Cancel (driver only) */}
        {isActive && isDriver && (
          <button onClick={() => setShowConfirm(true)} disabled={cancelling || updating}
            className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-500/20 transition disabled:opacity-50">
            {cancelling ? "Cancelling..." : "Cancel Ride"}
          </button>
        )}

        {/* Completed */}
        {ride.status === "completed" && (
          <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-5 text-center">
            <p className="text-green-400 font-bold text-xl">🎉 Ride Completed!</p>
            <p className="text-gray-400 text-sm mt-1">
              Earnings: <span className="text-white font-bold">₹{parseFloat(ride.fare).toFixed(2)}</span>
            </p>
          </div>
        )}

        {/* Cancelled */}
        {ride.status === "cancelled" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
            <p className="text-red-400 font-bold text-lg">Ride Cancelled</p>
          </div>
        )}

        <Link href="/dashboard/driver"
          className="flex items-center justify-center w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition">
          Back to Driver Dashboard
        </Link>
      </div>
    </div>
  );
}