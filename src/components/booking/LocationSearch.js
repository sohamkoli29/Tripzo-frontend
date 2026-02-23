"use client";

import { useEffect, useRef, useState } from "react";

export default function LocationSearch({
  label,
  placeholder,
  icon,
  value,
  onSelect,
}) {
  const inputRef    = useRef(null);
  const [input, setInput] = useState(value?.address || "");

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode", "establishment"],
      fields: ["formatted_address", "geometry", "name"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      const location = {
        address: place.formatted_address || place.name,
        lat:     place.geometry.location.lat(),
        lng:     place.geometry.location.lng(),
      };

      setInput(location.address);
      onSelect(location);
    });

    return () => google.maps.event.clearInstanceListeners(autocomplete);
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="text-gray-400 text-sm flex items-center gap-2">
        <span>{icon}</span>
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 text-white px-4 py-3.5 rounded-xl border border-gray-700
                     focus:outline-none focus:border-yellow-400 transition placeholder:text-gray-600 text-sm"
        />
        {input && (
          <button
            type="button"
            onClick={() => { setInput(""); onSelect(null); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}