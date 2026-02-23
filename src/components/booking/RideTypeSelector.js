"use client";

const RIDE_TYPES = [
  {
    id:       "standard",
    label:    "Standard",
    icon:     "🚖",
    desc:     "Affordable everyday rides",
    capacity: "1-3 passengers",
  },
  {
    id:       "premium",
    label:    "Premium",
    icon:     "🚘",
    desc:     "Luxury & comfort",
    capacity: "1-3 passengers",
  },
  {
    id:       "xl",
    label:    "XL",
    icon:     "🚐",
    desc:     "Extra space for groups",
    capacity: "1-6 passengers",
  },
];

export default function RideTypeSelector({ selected, estimates, onChange }) {
  return (
    <div className="space-y-2">
      <label className="text-gray-400 text-sm">Ride Type</label>
      <div className="grid grid-cols-3 gap-3">
        {RIDE_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={`p-3 rounded-xl border text-left transition-all duration-200
              ${selected === type.id
                ? "border-yellow-400 bg-yellow-400/10"
                : "border-gray-700 bg-gray-800 hover:border-gray-500"
              }`}
          >
            <span className="text-2xl">{type.icon}</span>
            <p className={`text-sm font-semibold mt-1
              ${selected === type.id ? "text-yellow-400" : "text-white"}`}>
              {type.label}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">{type.capacity}</p>
            {estimates?.[type.id] && (
              <p className={`text-sm font-bold mt-2
                ${selected === type.id ? "text-yellow-400" : "text-gray-300"}`}>
                ${estimates[type.id]}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}