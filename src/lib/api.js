import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

// Automatically attaches the Supabase JWT token to every request
async function apiFetch(endpoint, options = {}) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "API error");
  return data;
}

export const api = {
  // Users
  getProfile: () => apiFetch("/api/users/profile"),
  updateProfile: (body) => apiFetch("/api/users/profile", {
    method: "PUT", body: JSON.stringify(body)
  }),

  // Rides
  createRide: (body) => apiFetch("/api/rides", {
    method: "POST", body: JSON.stringify(body)
  }),
  getRides: () => apiFetch("/api/rides"),
  getRideById: (id) => apiFetch(`/api/rides/${id}`),
  updateRideStatus: (id, status) => apiFetch(`/api/rides/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status })
  }),
  getAvailableRides: () => apiFetch("/api/rides/available"),

  // Payments
  createPayment: (body) => apiFetch("/api/payments", {
    method: "POST", body: JSON.stringify(body)
  }),
  getPayments: () => apiFetch("/api/payments"),
  getPaymentById: (id) => apiFetch(`/api/payments/${id}`),
  estimateFare: (body) => apiFetch("/api/rides/estimate", {
  method: "POST", body: JSON.stringify(body)
}),
};