import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, personNumber, personRole, description }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-stone-400" />
        </div>
        <h2 className="text-xl font-semibold text-stone-800">{title}</h2>
        <p className="text-sm text-stone-500 mt-2">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-lg text-sm">
          <span className="font-medium">Integration Point:</span>
          <span>Person {personNumber} — {personRole}</span>
        </div>
        {/* TODO: Person {personNumber} — Replace this component with your actual implementation.
            Your API endpoint should be called here. See src/api/ for the axios setup. */}
      </div>
    </div>
  );
}
