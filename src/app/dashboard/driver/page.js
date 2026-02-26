"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useDriverNotifications } from "@/hooks/useNotifications";
import DriverToggle      from "@/components/driver/DriverToggle";
import AvailableRideCard from "@/components/driver/AvailableRideCard";
import DriverStatsBar    from "@/components/driver/DriverStatsBar";

export default function DriverDashboardPage() {
  const supabase = createClient();

  const [driverId,       setDriverId]       = useState(null);
  const [isOnline,       setIsOnline]       = useState(false);
  const [location,       setLocation]       = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [stats,          setStats]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [toggling,       setToggling]       = useState(false);
  const [locationError,  setLocationError]  = useState("");
  const [lastRefreshed,  setLastRefreshed]  = useState(null);
  const [initError,      setInitError]      = useState("");

  const pollRef = useRef(null);

  // Get driver user id
  useEffect(() => {
    const getDriver = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setDriverId(user.id);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    getDriver();
  }, []);

  // Realtime new-ride notifications
  useDriverNotifications({ isOnline, driverId });

  // Load driver status + stats — each call is independent so one failure won't crash both
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setInitError("");

      // Driver status — safe fallback for new drivers with no location row yet
      try {
        const statusData = await api.getDriverStatus();
        setIsOnline(statusData?.is_online || false);
        if (statusData?.lat && statusData?.lng) {
          setLocation({ lat: statusData.lat, lng: statusData.lng });
        }
      } catch (err) {
        // New driver with no location row — this is expected, not a real error
        console.log("Driver status not found (new driver):", err.message);
        setIsOnline(false);
      }

      // Driver stats — safe fallback for drivers with no rides yet
      try {
        const statsData = await api.getDriverStats();
        setStats(statsData);
      } catch (err) {
        console.log("Driver stats not found:", err.message);
        setStats({
          total_trips:    0,
          total_earnings: 0,
          today_trips:    0,
          today_earnings: 0,
        });
      }

      setLoading(false);
    };
    init();
  }, []);

  // Get browser geolocation
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported by your browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()    => reject(new Error("Location access denied — please allow location in browser settings")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  // Fetch nearby available rides
  const fetchAvailableRides = useCallback(async (loc) => {
    try {
      const coords = loc || location;
      if (!coords) return;
      const rides = await api.getAvailableRides(coords.lat, coords.lng);
      setAvailableRides(rides || []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Fetch rides error:", err.message);
    }
  }, [location]);

  // Auto-poll every 10s while online
  useEffect(() => {
    if (isOnline && location) {
      fetchAvailableRides(location);
      pollRef.current = setInterval(() => fetchAvailableRides(location), 10000);
    } else {
      setAvailableRides([]);
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [isOnline, location, fetchAvailableRides]);

  // Push GPS to backend every 30s while online
  useEffect(() => {
    if (!isOnline || !location) return;
    const locationInterval = setInterval(async () => {
      try {
        const coords = await getCurrentLocation();
        setLocation(coords);
        await api.updateLocation({ lat: coords.lat, lng: coords.lng, is_online: true });
      } catch {}
    }, 30000);
    return () => clearInterval(locationInterval);
  }, [isOnline]);

  // Toggle online / offline
  const handleToggle = async () => {
    setToggling(true);
    setLocationError("");

    try {
      if (!isOnline) {
        const coords = await getCurrentLocation();
        setLocation(coords);
        await api.updateLocation({ lat: coords.lat, lng: coords.lng, is_online: true });
        setIsOnline(true);
        await fetchAvailableRides(coords);
      } else {
        await api.updateLocation({
          lat:       location?.lat || 0,
          lng:       location?.lng || 0,
          is_online: false,
        });
        setIsOnline(false);
        setAvailableRides([]);
      }
    } catch (err) {
      setLocationError(err.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const handleRideAccepted = (rideId) => {
    setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
  };

  const refreshStats = async () => {
    try {
      const statsData = await api.getDriverStats();
      setStats(statsData);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">Loading driver dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Driver Dashboard</h1>
          <p className="text-gray-400 mt-1">
            {isOnline
              ? availableRides.length + " ride" + (availableRides.length !== 1 ? "s" : "") + " available near you"
              : "Go online to see ride requests"
            }
          </p>
        </div>
        {lastRefreshed && isOnline && (
          <div className="text-right">
            <p className="text-gray-600 text-xs">Auto-refreshing every 10s</p>
            <p className="text-gray-600 text-xs mt-0.5">
              Last updated {lastRefreshed.toLocaleTimeString([], {
                hour: "2-digit", minute: "2-digit", second: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Init error — non-fatal, just informational */}
      {initError && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 px-4 py-3 rounded-xl text-sm">
          ⚠️ {initError}
        </div>
      )}

      {/* Online / Offline Toggle */}
      <DriverToggle isOnline={isOnline} onToggle={handleToggle} loading={toggling} />

      {/* Location Error */}
      {locationError && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {locationError}
        </div>
      )}

      {/* Stats Bar */}
      <DriverStatsBar stats={stats} />

      {/* Available Rides */}
      {isOnline && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">Nearby Ride Requests</h2>
            <button
              onClick={() => fetchAvailableRides(location)}
              className="text-yellow-400 text-sm hover:underline transition"
            >
              Refresh
            </button>
          </div>

          {availableRides.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-white font-semibold text-lg">No rides nearby right now</p>
              <p className="text-gray-500 text-sm mt-2">
                New requests will appear here automatically and you will be notified
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {availableRides.map((ride) => (
                <AvailableRideCard
                  key={ride.id}
                  ride={ride}
                  onAccepted={(rideId) => {
                    handleRideAccepted(rideId);
                    refreshStats();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offline placeholder */}
      {!isOnline && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-6xl mb-4">🚗</p>
          <p className="text-white font-semibold text-xl">You are offline</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Toggle the switch above to go online and start accepting rides.
            You will receive real-time notifications for new requests.
          </p>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {toggling ? "Going online..." : "Go Online Now"}
          </button>
        </div>
      )}

    </div>
  );
}