export default function StatCard({ label, value, icon: Icon, color = 'text-emerald-600', bgColor = 'bg-emerald-50' }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-stone-500">{label}</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{value ?? '—'}</p>
        </div>
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}
