"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationContext } from "@/context/NotificationContext";

const statusMessages = {
  accepted:    { title: "Driver Found!",    body: "A driver accepted your ride and is on the way.", icon: "🚗", type: "success" },
  in_progress: { title: "Ride Started!",    body: "Your ride is now in progress. Enjoy the trip!", icon: "🚖", type: "info"    },
  completed:   { title: "Ride Completed!",  body: "You have arrived. Hope you enjoyed the ride!",  icon: "🎉", type: "success" },
  cancelled:   { title: "Ride Cancelled",   body: "Your ride has been cancelled.",                  icon: "❌", type: "error"   },
  requested:   { title: "Ride Requested",   body: "Looking for a driver near you...",               icon: "🔍", type: "info"   },
};

export function useRideRealtime({ rideId, onStatusChange, onDriverLocationChange }) {
  const supabase   = createClient();
  const { addNotification, addToast } = useNotificationContext();
  const prevStatus = useRef(null);

  useEffect(() => {
    if (!rideId) return;

    // ── Channel 1: Ride status updates ──────────────────────────────
    const rideChannel = supabase
      .channel("ride-status-" + rideId)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "rides",
          filter: "id=eq." + rideId,
        },
        (payload) => {
          const updatedRide = payload.new;
          const newStatus   = updatedRide.status;

          // Only fire if status actually changed
          if (newStatus === prevStatus.current) return;
          prevStatus.current = newStatus;

          const msg = statusMessages[newStatus];
          if (msg) {
            // Persistent notification in bell
            addNotification({
              title:  msg.title,
              body:   msg.body,
              icon:   msg.icon,
              type:   msg.type,
              rideId,
            });

            // Pop-up toast
            addToast({
              title:    msg.title,
              body:     msg.body,
              icon:     msg.icon,
              type:     msg.type,
              duration: 5000,
            });
          }

          // Update ride state in the component
          onStatusChange?.(updatedRide);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Realtime subscribed to ride:", rideId);
        }
      });

    // ── Channel 2: Driver location updates ──────────────────────────
    // Only subscribe if the caller wants location updates
    let locationChannel = null;

    if (onDriverLocationChange) {
      locationChannel = supabase
        .channel("driver-loc-" + rideId)
        .on(
          "postgres_changes",
          {
            event:  "UPDATE",
            schema: "public",
            table:  "driver_locations",
          },
          (payload) => {
            const loc = payload.new;
            if (loc && loc.lat && loc.lng) {
              onDriverLocationChange({ lat: loc.lat, lng: loc.lng });
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(rideChannel);
      if (locationChannel) supabase.removeChannel(locationChannel);
    };
  }, [rideId]);
}