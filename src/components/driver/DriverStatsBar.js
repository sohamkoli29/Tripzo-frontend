export default function DriverStatsBar({ stats }) {
  const items = [
    { icon: "💰", label: "Today's Earnings", value: `$${stats?.today_earnings  ?? "0.00"}` },
    { icon: "🚖", label: "Today's Trips",    value:    stats?.today_trips       ?? 0        },
    { icon: "💳", label: "Total Earnings",   value: `$${stats?.total_earnings  ?? "0.00"}` },
    { icon: "✅", label: "Total Trips",      value:    stats?.total_trips       ?? 0        },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-gray-600 text-xs uppercase tracking-widest">
              {item.label}
            </span>
          </div>
          <p className="text-white text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}