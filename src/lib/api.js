// frontend/src/lib/api.js
import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN CACHE
// ─────────────────────────────────────────────────────────────────────────────
let _token      = null;
let _expiresAt  = 0;
let _refreshing = null;

async function getToken() {
  const now = Date.now();

  if (_token && now < _expiresAt - 90_000) return _token;
  if (_refreshing) return _refreshing;

  _refreshing = (async () => {
    try {
      const supabase = createClient();

      // Step 1: try localStorage session first (zero network)
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session && session.access_token) {
        const exp = session.expires_at
          ? session.expires_at * 1000
          : now + (session.expires_in || 3600) * 1000;

        if (exp > now + 90_000) {
          _token     = session.access_token;
          _expiresAt = exp;
          return _token;
        }
      }

      // Step 2: token missing or nearly expired — do ONE network refresh
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      const fresh = refreshData?.session;

      if (error || !fresh?.access_token) {
        // Clear cache so next call tries again instead of returning null
        _token     = null;
        _expiresAt = 0;
        // Redirect to sign-in — session is truly gone
        if (typeof window !== "undefined") {
          window.location.href = "/sign-in";
        }
        throw new Error("Session expired — redirecting to sign in");
      }

      _token     = fresh.access_token;
      _expiresAt = fresh.expires_at
        ? fresh.expires_at * 1000
        : now + (fresh.expires_in || 3600) * 1000;

      return _token;
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}

export function clearTokenCache() {
  _token      = null;
  _expiresAt  = 0;
  _refreshing = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH WRAPPER — retries once with a fresh token on 401
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options, _isRetry = false) {
  const token = await getToken();

  const res = await fetch(BASE_URL + endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token,
      ...(options && options.headers),
    },
  });

  // 401 — token was valid in cache but server rejected it (e.g. tab switch stomped localStorage)
  // Bust the cache and retry exactly once with a fresh token
  if (res.status === 401 && !_isRetry) {
    clearTokenCache();
    return apiFetch(endpoint, options, true);
  }

  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || "API error " + res.status);
  return responseData;
}

// ─────────────────────────────────────────────────────────────────────────────
// API METHODS
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  // Users
  getProfile:         ()           => apiFetch("/api/users/profile"),
  updateProfile:      (body)       => apiFetch("/api/users/profile",            { method: "PUT",   body: JSON.stringify(body) }),
  getDriverProfile:   (driver_id)  => apiFetch("/api/users/driver/" + driver_id),

  // Rides
  createRide:         (body)       => apiFetch("/api/rides",                    { method: "POST",  body: JSON.stringify(body) }),
  getRides:           ()           => apiFetch("/api/rides"),
  getRideById:        (id)         => apiFetch("/api/rides/" + id),
  updateRideStatus:   (id, status) => apiFetch("/api/rides/" + id + "/status",  { method: "PATCH", body: JSON.stringify({ status }) }),
  estimateFare:       (body)       => apiFetch("/api/rides/estimate",           { method: "POST",  body: JSON.stringify(body) }),

  // Payments
  getPayments:        ()           => apiFetch("/api/payments"),
  getPaymentById:     (id)         => apiFetch("/api/payments/" + id),

  // Razorpay
  createOrder:        (ride_id)    => apiFetch("/api/razorpay/create-order",    { method: "POST",  body: JSON.stringify({ ride_id }) }),
  verifyPayment:      (body)       => apiFetch("/api/razorpay/verify-payment",  { method: "POST",  body: JSON.stringify(body) }),
  collectCashPayment: (ride_id)    => apiFetch("/api/razorpay/cash-payment",    { method: "POST",  body: JSON.stringify({ ride_id }) }),
  getPaymentStatus:   (ride_id)    => apiFetch("/api/razorpay/payment-status/" + ride_id),

  // Driver
  updateLocation:     (body)       => apiFetch("/api/driver/location",          { method: "PUT",   body: JSON.stringify(body) }),
  getDriverStatus:    ()           => apiFetch("/api/driver/status"),
  getAvailableRides:  (lat, lng)   => apiFetch("/api/driver/available-rides?lat=" + lat + "&lng=" + lng + "&radius_km=15"),
  getMyDriverRides:   ()           => apiFetch("/api/driver/my-rides"),
  getDriverStats:     ()           => apiFetch("/api/driver/stats"),

  // Ratings
  submitRating:       (body)       => apiFetch("/api/ratings",                  { method: "POST",  body: JSON.stringify(body) }),
  getRatingByRide:    (ride_id)    => apiFetch("/api/ratings/ride/" + ride_id),
  getDriverRatings:   (driver_id)  => apiFetch("/api/ratings/driver/" + driver_id),
  getMyRatings:       ()           => apiFetch("/api/ratings/my-ratings"),
};