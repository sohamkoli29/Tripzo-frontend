"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api";
import { useDriverNotifications } from "@/hooks/useNotifications";
import DriverToggle      from "@/components/driver/DriverToggle";
import AvailableRideCard from "@/components/driver/AvailableRideCard";
import DriverStatsBar    from "@/components/driver/DriverStatsBar";

const POLL_INTERVAL_MS     = 15_000; // rides poll: every 15s (was 10s)
const LOCATION_INTERVAL_MS = 45_000; // GPS push: every 45s (was 30s)

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

  const pollRef     = useRef(null);
  const locationRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setDriverId(user.id);
      } catch {}
    })();
  }, []);

  useDriverNotifications({ isOnline, driverId });

  // Init — load status + stats independently so one failure doesn't block the other
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      try {
        const statusData = await api.getDriverStatus();
        setIsOnline(statusData?.is_online || false);
        if (statusData?.lat && statusData?.lng) {
          setLocation({ lat: statusData.lat, lng: statusData.lng });
        }
      } catch {
        setIsOnline(false);
      }

      try {
        const statsData = await api.getDriverStats();
        setStats(statsData);
      } catch {
        setStats({ total_trips: 0, total_earnings: 0, today_trips: 0, today_earnings: 0 });
      }

      setLoading(false);
    };
    init();
  }, []);

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        ()    => reject(new Error("Location access denied — please allow location in browser settings")),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  const fetchAvailableRides = useCallback(async (loc) => {
    try {
      const coords = loc || location;
      if (!coords) return;
      const rides = await api.getAvailableRides(coords.lat, coords.lng);
      setAvailableRides(rides || []);
      setLastRefreshed(new Date());
    } catch (err) {
      // Silently ignore — next poll will retry
      console.log("Rides fetch skipped:", err.message);
    }
  }, [location]);

  // Poll for rides while online — uses longer interval to avoid 429
  useEffect(() => {
    clearInterval(pollRef.current);
    if (isOnline && location) {
      fetchAvailableRides(location);
      pollRef.current = setInterval(() => fetchAvailableRides(location), POLL_INTERVAL_MS);
    } else {
      setAvailableRides([]);
    }
    return () => clearInterval(pollRef.current);
  }, [isOnline, location, fetchAvailableRides]);

  // Push GPS while online — less frequent to reduce token calls
  useEffect(() => {
    clearInterval(locationRef.current);
    if (!isOnline || !location) return;

    locationRef.current = setInterval(async () => {
      try {
        const coords = await getCurrentLocation();
        setLocation(coords);
        await api.updateLocation({ lat: coords.lat, lng: coords.lng, is_online: true });
      } catch {}
    }, LOCATION_INTERVAL_MS);

    return () => clearInterval(locationRef.current);
  }, [isOnline]);

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
          lat: location?.lat || 0, lng: location?.lng || 0, is_online: false,
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
            <p className="text-gray-600 text-xs">Refreshing every 15s</p>
            <p className="text-gray-600 text-xs mt-0.5">
              Last: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        )}
      </div>

      <DriverToggle isOnline={isOnline} onToggle={handleToggle} loading={toggling} />

      {locationError && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
          {locationError}
        </div>
      )}

      <DriverStatsBar stats={stats} />

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
              <p className="text-gray-500 text-sm mt-2">New requests appear here automatically</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {availableRides.map((ride) => (
                <AvailableRideCard
                  key={ride.id}
                  ride={ride}
                  onAccepted={(rideId) => {
                    setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
                    refreshStats();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isOnline && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-6xl mb-4">🚗</p>
          <p className="text-white font-semibold text-xl">You are offline</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Toggle the switch above to go online and start accepting rides.
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