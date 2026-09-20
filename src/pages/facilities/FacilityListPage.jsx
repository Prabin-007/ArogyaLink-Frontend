import { useState, useEffect } from 'react';
import { listFacilities } from '../../api/facilities';
import { Building2, MapPin, Phone } from 'lucide-react';

export default function FacilityListPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFacilities().then((res) => {
      setFacilities(res.data.data.facilities || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-stone-800">Healthcare Facility Network</h1>
        <p className="text-sm text-stone-500 mt-1">Network of PHCs, CHCs, and District Hospitals connected to ArogyaLink</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((fac) => (
            <div key={fac.id} className="bg-white rounded-xl border border-stone-200 p-5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-stone-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {fac.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 shrink-0">
                  {fac.type?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs text-stone-500 space-y-1">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{fac.block ? `${fac.block}, ${fac.district}` : fac.district}</span>
                </div>
                {fac.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{fac.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}