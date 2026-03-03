"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { StarDisplay } from "@/components/ratings/StarRating";
import RateRideModal from "@/components/ratings/RateRideModal";
import DriverCard from "@/components/driver/DriverCard";
import Link from "next/link";
import dynamic from "next/dynamic";
import Script from "next/script";

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
  const { id }  = useParams();
  const router  = useRouter();

  const [ride,           setRide]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [cancelling,     setCancelling]     = useState(false);
  const [error,          setError]          = useState("");
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [paymentStatus,  setPaymentStatus]  = useState("unpaid");
  const [scriptReady,    setScriptReady]    = useState(false);
  const [paying,         setPaying]         = useState(false);
  const [paySuccess,     setPaySuccess]     = useState(false);

  // Rating state
  const [existingRating, setExistingRating] = useState(null);
  const [showRateModal,  setShowRateModal]  = useState(false);
  const [ratingDone,     setRatingDone]     = useState(false);

  const checkPayment = async (rideId) => {
    try {
      const ps = await api.getPaymentStatus(rideId);
      setPaymentStatus(ps?.status || "unpaid");
    } catch { setPaymentStatus("unpaid"); }
  };

  const checkRating = async (rideId) => {
    try {
      const { rating } = await api.getRatingByRide(rideId);
      if (rating) { setExistingRating(rating); setRatingDone(true); }
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getRideById(id);
        setRide(data);
        if (["in_progress", "completed"].includes(data.status)) await checkPayment(id);
        if (data.status === "completed") await checkRating(id);
      } catch {
        router.push("/dashboard/rides");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useRideRealtime({
    rideId: id,
    onStatusChange: async (updatedRide) => {
      setRide(updatedRide);
      if (["in_progress", "completed"].includes(updatedRide.status)) await checkPayment(id);
      if (updatedRide.status === "completed") {
        await checkRating(id);
        setTimeout(() => setShowRateModal(true), 1500);
      }
    },
    onDriverLocationChange: (loc) => setDriverLocation(loc),
  });

  const handlePayOnline = async () => {
    if (!scriptReady) { setError("Payment gateway still loading, please wait."); return; }
    setPaying(true); setError("");
    try {
      const orderData = await api.createOrder(id);
      const options = {
        key: orderData.keyId,
        amount: Math.round(parseFloat(orderData.amount) * 100),
        currency: "INR", name: "Tripzo", description: "Ride Payment",
        order_id: orderData.orderId, theme: { color: "#FACC15" },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              ride_id:             id,
            });
            setPaymentStatus("completed");
            setPaySuccess(true);
          } catch (err) { setError("Verification failed: " + err.message); }
          finally { setPaying(false); }
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (res) => { setError("Payment failed: " + res.error.description); setPaying(false); });
      rzp.open();
    } catch (err) { setError(err.message || "Failed to initiate payment"); setPaying(false); }
  };

  const handleCancel = async () => {
    setCancelling(true); setError(""); setShowConfirm(false);
    try {
      const { ride: updated } = await api.updateRideStatus(id, "cancelled");
      setRide(updated);
    } catch (err) { setError("Failed to cancel: " + err.message); }
    finally { setCancelling(false); }
  };

  const buildMapsUrl = () => {
    if (!ride) return "#";
    const parts = ["https://www.google.com/maps/dir/?api=1"];
    if (ride.dropoff_lat && ride.dropoff_lng)
      parts.push("destination=" + ride.dropoff_lat + "," + ride.dropoff_lng);
    return parts.join("&");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-yellow-400 animate-pulse text-lg">Loading ride details...</p>
    </div>
  );
  if (!ride) return null;

  const status    = statusConfig[ride.status] || statusConfig.requested;
  const canCancel = CANCELLABLE_STATUSES.includes(ride.status);
  const isActive  = ["requested", "accepted", "in_progress"].includes(ride.status);
  const isPaid    = paymentStatus === "completed" || paymentStatus === "cash";
  const pickup    = ride.pickup_lat  && ride.pickup_lng  ? { lat: ride.pickup_lat,  lng: ride.pickup_lng  } : null;
  const dropoff   = ride.dropoff_lat && ride.dropoff_lng ? { lat: ride.dropoff_lat, lng: ride.dropoff_lng } : null;

  const tripItems = [
    { label: "Fare",      value: "₹" + parseFloat(ride.fare).toFixed(2), icon: "💳" },
    { label: "Distance",  value: ride.distance_km + " km",               icon: "📍" },
    { label: "Duration",  value: "~" + ride.duration_mins + " min",      icon: "⏱️" },
    { label: "Ride Type", value: ride.ride_type,                         icon: "🚖" },
  ];

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} strategy="afterInteractive" />

      {/* Rating Modal */}
      {showRateModal && !ratingDone && ride.status === "completed" && (
        <RateRideModal
          ride={ride}
          onClose={() => setShowRateModal(false)}
          onSubmitted={(r) => { setExistingRating(r); setRatingDone(true); setShowRateModal(false); }}
        />
      )}

      {/* Cancel Confirm */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-white font-bold text-lg">Cancel This Ride?</h3>
              <p className="text-gray-400 text-sm mt-2">
                {ride.status === "accepted" ? "A driver has already been assigned." : "Your ride request will be cancelled."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowConfirm(false)} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition">Keep Ride</button>
              <button onClick={handleCancel} disabled={cancelling} className="bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                {cancelling ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Success */}
      {paySuccess && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm space-y-5 text-center">
            <div className="text-6xl animate-bounce">🎉</div>
            <h3 className="text-white font-bold text-2xl">Payment Successful!</h3>
            <p className="text-gray-400 text-sm">₹{parseFloat(ride.fare).toFixed(2)} paid via Razorpay.</p>
            <div className="bg-gray-800 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="text-white font-bold">₹{parseFloat(ride.fare).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-green-400 font-semibold">Paid ✅</span></div>
            </div>
            <button onClick={() => { setPaySuccess(false); if (ride.status === "completed" && !ratingDone) setShowRateModal(true); }}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition">
              Done
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/rides" className="text-gray-400 hover:text-white transition text-sm">← Back to My Rides</Link>
          {canCancel && (
            <button onClick={() => setShowConfirm(true)} disabled={cancelling} className="text-red-400 hover:text-red-300 text-sm font-medium transition">Cancel Ride</button>
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
              <div className={"w-3 h-3 rounded-full " + (ride.status === "requested" ? "bg-yellow-400" : ride.status === "accepted" ? "bg-blue-400" : "bg-purple-400")} />
              <div className={"absolute inset-0 rounded-full animate-ping opacity-60 " + (ride.status === "requested" ? "bg-yellow-400" : ride.status === "accepted" ? "bg-blue-400" : "bg-purple-400")} />
            </div>
          )}
        </div>

        {/* ── DRIVER CARD — shown once driver is assigned ── */}
        {ride.driver_id && ride.status !== "requested" && (
          <DriverCard driverId={ride.driver_id} />
        )}

        {/* Driver on the way */}
        {ride.status === "accepted" && (
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-400/20 flex items-center justify-center text-2xl flex-shrink-0">🚗</div>
            <div>
              <p className="text-blue-400 font-semibold">Driver is on the way!</p>
              <p className="text-gray-400 text-sm mt-0.5">Heading to your pickup location.</p>
            </div>
          </div>
        )}

        {/* Payment Strip — in_progress */}
        {ride.status === "in_progress" && (
          <div className={"rounded-2xl border p-5 " + (isPaid ? "bg-green-400/10 border-green-400/30" : "bg-yellow-400/10 border-yellow-400/30")}>
            {isPaid ? (
              <div className="flex items-center gap-4">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-green-400 font-bold">Payment Complete</p>
                  <p className="text-gray-400 text-sm mt-0.5">₹{parseFloat(ride.fare).toFixed(2)} — {paymentStatus === "cash" ? "cash to driver" : "paid via Razorpay"}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">💳</span>
                  <div className="flex-1">
                    <p className="text-yellow-400 font-bold">Pay for your ride</p>
                    <p className="text-gray-400 text-sm mt-0.5">Pay now or give cash to driver at destination.</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-500 text-xs">Fare</p>
                    <p className="text-white font-bold text-xl">₹{parseFloat(ride.fare).toFixed(2)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[["💳","Card"],["📱","UPI"],["🏦","Net Banking"],["👛","Wallets"]].map(([icon,label]) => (
                    <div key={label} className="bg-gray-800/60 rounded-xl p-2 flex flex-col items-center gap-1">
                      <span>{icon}</span><span className="text-gray-400 text-xs">{label}</span>
                    </div>
                  ))}
                </div>
                <button onClick={handlePayOnline} disabled={paying || !scriptReady}
                  className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 text-base">
                  {paying ? "Opening Razorpay..." : !scriptReady ? "Loading..." : "Pay Now — ₹" + parseFloat(ride.fare).toFixed(2)}
                </button>
                <p className="text-gray-600 text-xs text-center">Secured by Razorpay · Or pay cash to driver</p>
              </div>
            )}
          </div>
        )}

        {/* Live location */}
        {driverLocation && isActive && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <div className="absolute inset-0 rounded-full bg-yellow-400 animate-ping opacity-60" />
            </div>
            <p className="text-yellow-400 text-sm font-medium">Showing live driver location on map</p>
          </div>
        )}

        {/* Map */}
        {(pickup || dropoff) && (
          <div className="h-64 rounded-2xl overflow-hidden border border-gray-800">
            <MapView pickup={driverLocation || pickup} dropoff={dropoff} />
          </div>
        )}

        {/* Route Info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Your Route</h2>
          <div className="flex gap-4 items-start mb-5">
            <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-400" /><div className="w-0.5 h-10 bg-gray-700" /><div className="w-3 h-3 rounded-full bg-red-400" />
            </div>
            <div className="flex-1 space-y-4 min-w-0">
              <div><p className="text-gray-500 text-xs uppercase tracking-wide">Pickup</p><p className="text-white text-sm mt-0.5">{ride.pickup_address}</p></div>
              <div><p className="text-gray-500 text-xs uppercase tracking-wide">Dropoff</p><p className="text-white text-sm mt-0.5">{ride.dropoff_address}</p></div>
            </div>
          </div>
          <a href={buildMapsUrl()} target="_blank" rel="noreferrer"
            className="flex items-center justify-center w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 rounded-xl transition text-sm">
            View in Google Maps
          </a>
        </div>

        {/* Trip Info */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-white font-semibold mb-4">Trip Info</h2>
          <div className="grid grid-cols-2 gap-3">
            {tripItems.map((item) => (
              <div key={item.label} className="bg-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs">{item.icon} {item.label}</p>
                <p className="text-white font-semibold mt-1.5 capitalize">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rating Section — completed rides */}
        {ride.status === "completed" && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-white font-semibold mb-5">Your Rating</h2>
            {ratingDone && existingRating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-5 bg-gray-800/50 rounded-2xl p-4">
                  <div className="text-4xl font-bold text-yellow-400">{existingRating.stars}.0</div>
                  <div>
                    <StarDisplay value={existingRating.stars} size="md" showNumber={false} />
                    <p className="text-gray-300 text-sm font-medium mt-1">
                      {["","Terrible","Poor","Okay","Good","Excellent"][existingRating.stars]}
                    </p>
                  </div>
                </div>
                {existingRating.review && (
                  <div className="bg-gray-800 rounded-xl px-4 py-3 border-l-2 border-yellow-400/40">
                    <p className="text-gray-300 text-sm italic leading-relaxed">"{existingRating.review}"</p>
                  </div>
                )}
                <button onClick={() => setShowRateModal(true)} className="text-yellow-400 text-sm hover:underline">Edit rating →</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-gray-400 text-sm text-center max-w-xs">Help other riders by sharing your experience with this driver.</p>
                <button onClick={() => setShowRateModal(true)}
                  className="flex items-center gap-2 bg-yellow-400 text-black font-bold px-8 py-3.5 rounded-2xl hover:bg-yellow-300 transition text-sm">
                  <span>★</span> Rate This Ride
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>}

        {/* Actions */}
        <div className="space-y-3 pb-8">
          {ride.status === "completed" && !isPaid && (
            <button onClick={handlePayOnline} disabled={paying || !scriptReady}
              className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 text-base">
              {paying ? "Opening Razorpay..." : "Pay Now — ₹" + parseFloat(ride.fare).toFixed(2)}
            </button>
          )}
          {ride.status === "completed" && isPaid && (
            <div className="bg-green-400/10 border border-green-400/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div><p className="text-green-400 font-semibold text-sm">Payment Complete</p><p className="text-gray-500 text-xs mt-0.5">₹{parseFloat(ride.fare).toFixed(2)} paid</p></div>
              </div>
              <Link href="/dashboard/payments" className="text-yellow-400 text-sm hover:underline">Receipt →</Link>
            </div>
          )}
          {canCancel && (
            <button onClick={() => setShowConfirm(true)} disabled={cancelling}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-500/20 transition disabled:opacity-50">
              {cancelling ? "Cancelling..." : "Cancel Ride"}
            </button>
          )}
          {ride.status === "in_progress" && !isPaid && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs">You can also pay cash directly to the driver at the end of the ride</p>
            </div>
          )}
          {ride.status === "cancelled" && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center space-y-3">
              <p className="text-red-400 font-bold text-lg">Ride Cancelled</p>
              <Link href="/dashboard/book" className="inline-block bg-yellow-400 text-black font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 transition text-sm">Book a New Ride</Link>
            </div>
          )}
          <Link href="/dashboard" className="flex items-center justify-center w-full bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition">Back to Dashboard</Link>
        </div>
      </div>
    </>
  );
}