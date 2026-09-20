import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listPatients } from '../../api/patients';
import { Search, ChevronRight } from 'lucide-react';

export default function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await listPatients(params);
      setPatients(res.data.data.patients || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAge = (dob) => {
    if (!dob) return '—';
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Patients</h1>
          <p className="text-sm text-stone-500 mt-1">Browse and search registered patients</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, village..."
            className="pl-9 pr-4 py-2 rounded-lg border border-stone-300 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-12 text-stone-500 text-sm">No patients found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden sm:table-cell">Age</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden sm:table-cell">Gender</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden md:table-cell">Village</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden lg:table-cell">District</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-stone-800">{p.name}</div>
                    <div className="text-xs text-stone-400 sm:hidden">{p.village} · {p.gender}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{getAge(p.dateOfBirth)}</td>
                  <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{p.gender}</td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{p.village}</td>
                  <td className="px-4 py-3 text-stone-600 hidden lg:table-cell">{p.district}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/patients/${p.id}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      View <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
