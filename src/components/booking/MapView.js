"use client";

import { useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";

// Draws the route between pickup and dropoff
function RouteRenderer({ pickup, dropoff }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !pickup || !dropoff) return;

    const directionsService  = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#FACC15",
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });

    directionsRenderer.setMap(map);

    directionsService.route(
      {
        origin:      { lat: pickup.lat,  lng: pickup.lng  },
        destination: { lat: dropoff.lat, lng: dropoff.lng },
        travelMode:  google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK") directionsRenderer.setDirections(result);
      }
    );

    return () => directionsRenderer.setMap(null);
  }, [map, pickup, dropoff]);

  return null;
}

export default function MapView({ pickup, dropoff }) {
  const defaultCenter = { lat: 19.076, lng: 72.8777 }; // Mumbai default

  const center = pickup
    ? { lat: pickup.lat, lng: pickup.lng }
    : defaultCenter;

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
      <div className="w-full h-full rounded-2xl overflow-hidden">
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="rideapp-map"
          styles={darkMapStyles}
        >
          {/* Pickup Marker - Green */}
          {pickup && (
            <Marker
              position={{ lat: pickup.lat, lng: pickup.lng }}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              }}
              title="Pickup"
            />
          )}

          {/* Dropoff Marker - Red */}
          {dropoff && (
            <Marker
              position={{ lat: dropoff.lat, lng: dropoff.lng }}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              }}
              title="Dropoff"
            />
          )}

          {/* Route line */}
          {pickup && dropoff && (
            <RouteRenderer pickup={pickup} dropoff={dropoff} />
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

// Dark mode map styles to match our UI
const darkMapStyles = [
  { elementType: "geometry",        stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill",stylers: [{ color: "#8ec3b9" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
  { featureType: "road",            elementType: "geometry",
    stylers: [{ color: "#304a7d" }] },
  { featureType: "road",            elementType: "geometry.stroke",
    stylers: [{ color: "#255763" }] },
  { featureType: "road.highway",    elementType: "geometry",
    stylers: [{ color: "#2c6675" }] },
  { featureType: "water",           elementType: "geometry",
    stylers: [{ color: "#0e1626" }] },
  { featureType: "poi",             stylers: [{ visibility: "off" }] },
];