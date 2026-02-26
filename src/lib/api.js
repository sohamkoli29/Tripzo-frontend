import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function getToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  if (refreshed?.access_token) return refreshed.access_token;
  return null;
}

async function apiFetch(endpoint, options = {}) {
  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

export const api = {
  // Users
  getProfile:    ()     => apiFetch("/api/users/profile"),
  updateProfile: (body) => apiFetch("/api/users/profile", {
    method: "PUT", body: JSON.stringify(body),
  }),

  // Rides
  createRide:       (body)        => apiFetch("/api/rides", {
    method: "POST", body: JSON.stringify(body),
  }),
  getRides:         ()            => apiFetch("/api/rides"),
  getRideById:      (id)          => apiFetch(`/api/rides/${id}`),
  updateRideStatus: (id, status)  => apiFetch(`/api/rides/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status }),
  }),
  getAvailableRides: (lat, lng)   =>
    apiFetch(`/api/driver/available-rides?lat=${lat}&lng=${lng}&radius_km=15`),
  estimateFare: (body) => apiFetch("/api/rides/estimate", {
    method: "POST", body: JSON.stringify(body),
  }),

  // Payments (legacy)
  createPayment:  (body) => apiFetch("/api/payments", {
    method: "POST", body: JSON.stringify(body),
  }),
  getPayments:    ()     => apiFetch("/api/payments"),
  getPaymentById: (id)   => apiFetch(`/api/payments/${id}`),

  // Driver
  updateLocation:   (body) => apiFetch("/api/driver/location", {
    method: "PUT", body: JSON.stringify(body),
  }),
  getDriverStatus:  ()     => apiFetch("/api/driver/status"),
  getMyDriverRides: ()     => apiFetch("/api/driver/my-rides"),
  getDriverStats:   ()     => apiFetch("/api/driver/stats"),

  // Razorpay
  createOrder:        (ride_id) => apiFetch("/api/razorpay/create-order", {
    method: "POST", body: JSON.stringify({ ride_id }),
  }),
  verifyPayment:      (body)    => apiFetch("/api/razorpay/verify-payment", {
    method: "POST", body: JSON.stringify(body),
  }),
  collectCashPayment: (ride_id) => apiFetch("/api/razorpay/cash-payment", {
    method: "POST", body: JSON.stringify({ ride_id }),
  }),
  getPaymentStatus:   (ride_id) => apiFetch(`/api/razorpay/payment-status/${ride_id}`),
};