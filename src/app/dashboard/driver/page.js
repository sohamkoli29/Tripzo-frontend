"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import DriverToggle      from "@/components/driver/DriverToggle";
import AvailableRideCard from "@/components/driver/AvailableRideCard";
import DriverStatsBar    from "@/components/driver/DriverStatsBar";

export default function DriverDashboardPage() {
  const [isOnline,        setIsOnline]        = useState(false);
  const [location,        setLocation]        = useState(null);
  const [availableRides,  setAvailableRides]  = useState([]);
  const [stats,           setStats]           = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [toggling,        setToggling]        = useState(false);
  const [locationError,   setLocationError]   = useState("");
  const [lastRefreshed,   setLastRefreshed]   = useState(null);

  const pollRef = useRef(null);

  // Load initial driver status & stats
  useEffect(() => {
    const init = async () => {
      try {
        const [statusData, statsData] = await Promise.all([
          api.getDriverStatus(),
          api.getDriverStats(),
        ]);
        setIsOnline(statusData?.is_online || false);
        setStats(statsData);

        if (statusData?.lat && statusData?.lng) {
          setLocation({ lat: statusData.lat, lng: statusData.lng });
        }
      } catch (err) {
        console.error("Init error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Get browser geolocation
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(new Error("Location access denied")),
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

  // Auto-poll rides every 10 seconds while online
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

  // Toggle online/offline
  const handleToggle = async () => {
    setToggling(true);
    setLocationError("");

    try {
      if (!isOnline) {
        // Going online — get location first
        const coords = await getCurrentLocation();
        setLocation(coords);

        await api.updateLocation({
          lat:       coords.lat,
          lng:       coords.lng,
          is_online: true,
        });

        setIsOnline(true);
        await fetchAvailableRides(coords);
      } else {
        // Going offline
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

  // Remove accepted ride from the list
  const handleRideAccepted = (rideId) => {
    setAvailableRides((prev) => prev.filter((r) => r.id !== rideId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-yellow-400 animate-pulse text-lg">
          Loading driver dashboard...
        </p>
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
              ? `${availableRides.length} ride${availableRides.length !== 1 ? "s" : ""} available near you`
              : "Go online to see ride requests"
            }
          </p>
        </div>
        {lastRefreshed && isOnline && (
          <p className="text-gray-600 text-xs">
            Last updated {lastRefreshed.toLocaleTimeString([], {
              hour: "2-digit", minute: "2-digit", second: "2-digit"
            })}
          </p>
        )}
      </div>

      {/* Online/Offline Toggle */}
      <DriverToggle
        isOnline={isOnline}
        onToggle={handleToggle}
        loading={toggling}
      />

      {/* Location Error */}
      {locationError && (
        <div className="bg-red-500/10 border border-red-500 text-red-400
                        px-4 py-3 rounded-xl text-sm">
          ❌ {locationError} — Please allow location access in your browser.
        </div>
      )}

      {/* Stats Bar */}
      <DriverStatsBar stats={stats} />

      {/* Available Rides */}
      {isOnline && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-lg">
              Nearby Ride Requests
            </h2>
            <button
              onClick={() => fetchAvailableRides(location)}
              className="text-yellow-400 text-sm hover:underline"
            >
              Refresh ↻
            </button>
          </div>

          {availableRides.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl
                            p-12 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-white font-semibold text-lg">
                No rides nearby right now
              </p>
              <p className="text-gray-500 text-sm mt-2">
                New requests will appear here automatically
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {availableRides.map((ride) => (
                <AvailableRideCard
                  key={ride.id}
                  ride={ride}
                  onAccepted={handleRideAccepted}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offline Placeholder */}
      {!isOnline && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-6xl mb-4">🚗</p>
          <p className="text-white font-semibold text-xl">You're offline</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Toggle the switch above to go online and start accepting rides
          </p>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="bg-yellow-400 text-black font-bold px-8 py-3
                       rounded-xl hover:bg-yellow-300 transition disabled:opacity-50"
          >
            {toggling ? "Going online..." : "Go Online Now"}
          </button>
        </div>
      )}

    </div>
  );
}