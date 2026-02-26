"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";

export default function CheckoutPage() {
  const { rideId } = useParams();
  const router     = useRouter();

  const [ride,        setRide]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [paying,      setPaying]      = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [paymentId,   setPaymentId]   = useState("");
  const [error,       setError]       = useState("");
  const [rzpReady,    setRzpReady]    = useState(false);

  // ── Load Razorpay script manually via useEffect ──────────────
  // Next.js Script onReady is unreliable in app router — this is the fix
  useEffect(() => {
    if (window.Razorpay) {
      setRzpReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src   = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRzpReady(true);
    script.onerror = () => setError("Failed to load Razorpay. Please refresh.");
    document.body.appendChild(script);
    return () => {
      // Don't remove — keep it cached for fast re-use
    };
  }, []);

  // ── Load ride and payment status ─────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [statusData, rideData] = await Promise.all([
          api.getPaymentStatus(rideId),
          api.getRideById(rideId),
        ]);

        if (statusData?.status === "completed") {
          setAlreadyPaid(true);
          setLoading(false);
          return;
        }

        setRide(rideData);
      } catch (err) {
        setError(err.message || "Failed to load payment details");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [rideId]);

  // ── Open Razorpay checkout ────────────────────────────────────
  const handlePayment = async () => {
    if (!rzpReady) {
      setError("Payment gateway is still loading. Please wait.");
      return;
    }

    if (!window.Razorpay) {
      setError("Razorpay failed to load. Please refresh the page.");
      return;
    }

    setPaying(true);
    setError("");

    try {
      const orderData = await api.createOrder(rideId);

      const options = {
        key:         orderData.keyId,
        amount:      Math.round(parseFloat(orderData.amount) * 100),
        currency:    "INR",
        name:        "Tripzo",
        description: "Ride Payment",
        order_id:    orderData.orderId,
        theme:       { color: "#FACC15" },

        prefill: {
          name:    "",
          email:   "",
          contact: "",
        },

        modal: {
          ondismiss: () => {
            setPaying(false);
          },
          escape: true,
        },

        handler: async (response) => {
          try {
            await api.verifyPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              ride_id:             rideId,
            });
            setPaymentId(response.razorpay_payment_id);
            setSuccess(true);
          } catch (err) {
            setError("Payment verified by Razorpay but confirmation failed: " + err.message);
          } finally {
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response) => {
        setError("Payment failed: " + (response.error?.description || "Unknown error"));
        setPaying(false);
      });

      rzp.open();

    } catch (err) {
      setError(err.message || "Failed to initiate payment. Please try again.");
      setPaying(false);
    }
  };

  // ── Loading screen ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading payment...</p>
      </div>
    );
  }

  // ── Already paid screen ───────────────────────────────────────
  if (alreadyPaid) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <p className="text-5xl">✅</p>
        <h2 className="text-white font-bold text-2xl">Already Paid</h2>
        <p className="text-gray-400 text-sm">This ride has already been paid for.</p>
        <div className="flex gap-3">
          <Link
            href={"/dashboard/rides/" + rideId}
            className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition text-center"
          >
            Back to Ride
          </Link>
          <Link
            href="/dashboard/payments"
            className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition text-center"
          >
            View Receipt
          </Link>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <div className="text-6xl animate-bounce">🎉</div>
        <h2 className="text-white font-bold text-2xl">Payment Successful!</h2>
        <p className="text-gray-400 text-sm">
          Your payment of{" "}
          <span className="text-white font-bold">₹{parseFloat(ride?.fare || 0).toFixed(2)}</span>
          {" "}was processed successfully.
        </p>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-left space-y-3">
          {[
            { label: "Ride ID",    value: rideId?.slice(0, 8).toUpperCase()           },
            { label: "Amount",     value: "₹" + parseFloat(ride?.fare || 0).toFixed(2) },
            { label: "Payment ID", value: paymentId?.slice(-14).toUpperCase()          },
            { label: "Method",     value: "Razorpay"                                   },
            { label: "Status",     value: "Paid ✅"                                    },
          ].map((item) => (
            <div key={item.label} className="flex justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-500">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition text-center"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/payments"
            className="flex-1 bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition text-center"
          >
            View Receipt
          </Link>
        </div>
      </div>
    );
  }

  // ── Error (no ride loaded) ────────────────────────────────────
  if (error && !ride) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-12">
        <p className="text-5xl">❌</p>
        <h2 className="text-white font-bold text-2xl">Payment Error</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <Link
          href={"/dashboard/rides/" + rideId}
          className="inline-block bg-gray-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-gray-700 transition"
        >
          Back to Ride
        </Link>
      </div>
    );
  }

  // ── Main checkout UI ──────────────────────────────────────────
  return (
    <div className="max-w-md space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={"/dashboard/rides/" + rideId} className="text-gray-400 hover:text-white transition text-sm">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-white">Pay for Ride</h1>
      </div>

      {/* Ride Summary Card */}
      {ride && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold">Ride Summary</h2>

          <div className="flex gap-3 items-start">
            <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
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

          <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
            <p className="text-gray-500 text-xs capitalize">
              {ride.distance_km} km · ~{ride.duration_mins} min · {ride.ride_type}
            </p>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Total</p>
              <p className="text-yellow-400 font-bold text-2xl">
                ₹{parseFloat(ride.fare).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Supported */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Payment Method</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "💳", label: "Credit / Debit Card" },
            { icon: "📱", label: "UPI"                 },
            { icon: "🏦", label: "Net Banking"         },
            { icon: "👛", label: "Wallets"             },
          ].map((m) => (
            <div key={m.label} className="bg-gray-800 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">{m.icon}</span>
              <span className="text-gray-300 text-xs font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-600 text-xs text-center">
          Secured by Razorpay — India's most trusted payment gateway
        </p>
      </div>

      {/* Test credentials hint */}
      <div className="bg-blue-400/10 border border-blue-400/20 rounded-xl px-4 py-3 space-y-1">
        <p className="text-blue-400 text-xs font-semibold">🧪 Test Mode Credentials</p>
        <p className="text-gray-400 text-xs">
          Card: <span className="text-white font-mono">4111 1111 1111 1111</span>
        </p>
        <p className="text-gray-400 text-xs">
          Expiry: <span className="text-white font-mono">Any future date</span>
          {" · "}CVV: <span className="text-white font-mono">Any 3 digits</span>
        </p>
        <p className="text-gray-400 text-xs">
          UPI: <span className="text-white font-mono">success@razorpay</span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={handlePayment}
        disabled={paying || !ride}
        className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {paying
          ? "Opening Razorpay..."
          : !rzpReady
            ? "Loading payment gateway..."
            : "Pay ₹" + parseFloat(ride?.fare || 0).toFixed(2) + " via Razorpay"
        }
      </button>

      <p className="text-gray-600 text-xs text-center pb-8">
        By paying you agree to Tripzo's terms of service
      </p>

    </div>
  );
}