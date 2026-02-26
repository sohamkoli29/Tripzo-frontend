"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";

const statusConfig = {
  completed: { badge: "bg-green-400/10  text-green-400  border-green-400/20",  label: "Paid"     },
  cash:      { badge: "bg-green-400/10  text-green-400  border-green-400/20",  label: "Cash Paid"},
  pending:   { badge: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20", label: "Pending"  },
  failed:    { badge: "bg-red-400/10    text-red-400    border-red-400/20",    label: "Failed"   },
  refunded:  { badge: "bg-blue-400/10   text-blue-400   border-blue-400/20",   label: "Refunded" },
};

const methodIcons = {
  razorpay:   "💳",
  cash:       "💵",
  upi:        "📱",
  wallet:     "👛",
  netbanking: "🏦",
  card:       "💳",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await api.getPayments();
        setPayments(data || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === "completed" || p.status === "cash")
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    .toFixed(2);

  const FILTERS = [
    { key: "all",     label: "All"      },
    { key: "paid",    label: "Paid"     },
    { key: "pending", label: "Pending"  },
  ];

  const filteredPayments = payments.filter((p) => {
    if (filter === "paid")    return p.status === "completed" || p.status === "cash";
    if (filter === "pending") return p.status === "pending";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Payments</h1>
        <p className="text-gray-400 mt-1">Your complete payment history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Spent",   value: "₹" + totalPaid,                                                               color: "text-yellow-400" },
          { label: "Transactions",  value: payments.length,                                                                color: "text-white"      },
          { label: "Paid",          value: payments.filter(p => p.status === "completed" || p.status === "cash").length,  color: "text-green-400"  },
          { label: "Pending",       value: payments.filter(p => p.status === "pending").length,                           color: "text-blue-400"   },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className={s.color + " text-xl font-bold"}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
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

      {/* Payment List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-white font-semibold">No payments found</p>
          <p className="text-gray-500 text-sm mt-2">
            {filter === "all" ? "Complete a ride to see payments here" : "No " + filter + " payments"}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Transaction History</h2>
          </div>

          <div className="divide-y divide-gray-800">
            {filteredPayments.map((payment) => {
              const st = statusConfig[payment.status] || statusConfig.pending;
              return (
                <div key={payment.id} className="p-5 flex items-center justify-between gap-4 hover:bg-gray-800/40 transition">

                  {/* Left */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                      {methodIcons[payment.payment_method] || "💳"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {payment.rides?.pickup_address || "Ride Payment"}
                      </p>
                      {payment.rides?.dropoff_address && (
                        <p className="text-gray-500 text-xs mt-0.5 truncate">
                          → {payment.rides.dropoff_address}
                        </p>
                      )}
                      <p className="text-gray-600 text-xs mt-1 capitalize">
                        {new Date(payment.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                        {" · "}{payment.payment_method}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={"text-xs px-3 py-1 rounded-full border font-medium " + st.badge}>
                      {st.label}
                    </span>
                    <span className="text-white font-bold text-base">
                      ₹{parseFloat(payment.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Footer */}
          <div className="px-5 py-4 border-t border-gray-800 flex items-center justify-between bg-gray-800/30">
            <p className="text-gray-400 text-sm">Total paid</p>
            <p className="text-yellow-400 font-bold text-lg">₹{totalPaid}</p>
          </div>
        </div>
      )}
    </div>
  );
}