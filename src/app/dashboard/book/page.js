"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import LocationSearch    from "@/components/booking/LocationSearch";
import RideTypeSelector  from "@/components/booking/RideTypeSelector";
import FareEstimate      from "@/components/booking/FareEstimate";

// Load map dynamically to avoid SSR issues
const MapView = dynamic(() => import("@/components/booking/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-900 rounded-2xl flex items-center justify-center">
      <p className="text-gray-500 animate-pulse">🗺️ Loading map...</p>
    </div>
  ),
});

export default function BookRidePage() {
  const router = useRouter();

  const [pickup,    setPickup]    = useState(null);
  const [dropoff,   setDropoff]   = useState(null);
  const [rideType,  setRideType]  = useState("standard");
  const [estimates, setEstimates] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // { distance_km, duration_mins }
  const [booking,   setBooking]   = useState(false);
  const [error,     setError]     = useState("");

  // Get distance & duration from Google Maps Directions API
  const fetchRouteInfo = useCallback(() => {
    if (!pickup || !dropoff || !window.google) return;

    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins:      [{ lat: pickup.lat,  lng: pickup.lng  }],
        destinations: [{ lat: dropoff.lat, lng: dropoff.lng }],
        travelMode:   google.maps.TravelMode.DRIVING,
        unitSystem:   google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status !== "OK") return;

        const element = response.rows[0].elements[0];
        if (element.status !== "OK") return;

        const distance_km    = element.distance.value / 1000;
        const duration_mins  = Math.ceil(element.duration.value / 60);

        setRouteInfo({ distance_km, duration_mins });
      }
    );
  }, [pickup, dropoff]);

  // Fetch fare estimates whenever pickup, dropoff, or routeInfo changes
  useEffect(() => {
    if (!routeInfo) return;

    const fetchEstimates = async () => {
      try {
        const data = await api.estimateFare({
          distance_km:   routeInfo.distance_km,
          duration_mins: routeInfo.duration_mins,
        });
        setEstimates(data.estimates);
      } catch (err) {
        console.error("Fare estimate failed:", err.message);
      }
    };

    fetchEstimates();
  }, [routeInfo]);

  // When both locations selected, fetch route
  useEffect(() => {
    if (pickup && dropoff) fetchRouteInfo();
  }, [pickup, dropoff, fetchRouteInfo]);

  const handleBookRide = async () => {
    if (!pickup)   return setError("Please select a pickup location.");
    if (!dropoff)  return setError("Please select a dropoff location.");

    setBooking(true);
    setError("");

    try {
      const { ride } = await api.createRide({
        pickup_address:  pickup.address,
        dropoff_address: dropoff.address,
        pickup_lat:      pickup.lat,
        pickup_lng:      pickup.lng,
        dropoff_lat:     dropoff.lat,
        dropoff_lng:     dropoff.lng,
        ride_type:       rideType,
        distance_km:     routeInfo?.distance_km   || 5,
        duration_mins:   routeInfo?.duration_mins || 10,
      });

      router.push(`/dashboard/rides/${ride.id}`);
    } catch (err) {
      setError(err.message || "Failed to book ride. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  const currentFare = estimates?.[rideType];

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-6">

      {/* Left Panel — Booking Form */}
      <div className="w-96 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Book a Ride</h1>
          <p className="text-gray-400 text-sm mt-1">Where are you going?</p>
        </div>

        {/* Location Inputs */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-4">

          <LocationSearch
            label="Pickup Location"
            placeholder="Enter pickup address"
            icon="🟢"
            value={pickup}
            onSelect={setPickup}
          />

          {/* Swap Arrow */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-800" />
            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-500">
              ↕
            </div>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <LocationSearch
            label="Dropoff Location"
            placeholder="Enter destination"
            icon="🔴"
            value={dropoff}
            onSelect={setDropoff}
          />
        </div>

        {/* Ride Type */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <RideTypeSelector
            selected={estimates ? rideType : rideType}
            estimates={estimates}
            onChange={setRideType}
          />
        </div>

        {/* Fare Estimate */}
        {currentFare && routeInfo && (
          <FareEstimate
            fare={currentFare}
            distance={routeInfo.distance_km}
            duration={routeInfo.duration_mins}
            rideType={rideType}
          />
        )}

        {/* Loading estimate */}
        {pickup && dropoff && !estimates && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm animate-pulse text-center">
              Calculating fare...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-xl text-sm">
            ❌ {error}
          </div>
        )}

        {/* Book Button */}
        <button
          onClick={handleBookRide}
          disabled={booking || !pickup || !dropoff}
          className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl
                     hover:bg-yellow-300 transition-all disabled:opacity-40
                     disabled:cursor-not-allowed text-base"
        >
          {booking ? "Booking your ride..." : `Book ${rideType.charAt(0).toUpperCase() + rideType.slice(1)} Ride${currentFare ? ` • $${currentFare}` : ""}`}
        </button>

        {/* Info note */}
        <p className="text-gray-600 text-xs text-center pb-4">
          Final fare may vary based on traffic conditions
        </p>
      </div>

      {/* Right Panel — Map */}
      <div className="flex-1 rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 min-h-96">
        <MapView pickup={pickup} dropoff={dropoff} />
      </div>

    </div>
  );
}