"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotificationContext } from "@/context/NotificationContext";

// Driver listens for NEW ride requests across all rides
export function useDriverNotifications({ isOnline, driverId }) {
  const supabase = createClient();
  const { addNotification, addToast } = useNotificationContext();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isOnline || !driverId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel("driver-new-rides-" + driverId)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "rides",
          filter: "status=eq.requested",
        },
        (payload) => {
          const ride = payload.new;

          addNotification({
            title:  "New Ride Request!",
            body:   ride.pickup_address + " to " + ride.dropoff_address,
            icon:   "🔔",
            type:   "info",
            rideId: ride.id,
          });

          addToast({
            title:    "New Ride Request!",
            body:     "$" + ride.fare + " — " + ride.ride_type + " ride nearby",
            icon:     "🔔",
            type:     "info",
            duration: 6000,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, driverId]);
}