export default function StatusBadge({ status, colorMap }) {
  const classes = colorMap?.[status] || 'bg-stone-100 text-stone-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
