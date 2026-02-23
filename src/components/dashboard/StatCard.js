export default function StatCard({ icon, label, value, sub, color = "yellow" }) {
  const colorMap = {
    yellow: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
    green:  "bg-green-400/10  text-green-400  border-green-400/20",
    blue:   "bg-blue-400/10   text-blue-400   border-blue-400/20",
    red:    "bg-red-400/10    text-red-400    border-red-400/20",
  };

  return (
    <div className={`rounded-2xl border p-6 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        <span className="text-xs uppercase tracking-widest opacity-60">{label}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-sm opacity-60 mt-1">{sub}</p>}
    </div>
  );
}