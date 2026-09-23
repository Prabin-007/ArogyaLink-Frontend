import { useState, useEffect } from 'react';
import {
  listMedicines,
  getMedicineAvailability,
  updateMedicineInventory,
  listDiagnostics,
  getDiagnosticAvailability,
  updateDiagnosticAvailability,
  listServices,
  getServiceAvailability,
  updateServiceAvailability,
  listNotifications,
  markNotificationRead,
} from '../../api/resources';
import { listFacilities } from '../../api/facilities';
import {
  Pill,
  Stethoscope,
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
} from 'lucide-react';

export default function ResourceManagementPage() {
  const [activeTab, setActiveTab] = useState('medicines');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  // Data states
  const [facilities, setFacilities] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [medicineAvailability, setMedicineAvailability] = useState([]);
  const [updatingMedicine, setUpdatingMedicine] = useState(false);

  const [diagnostics, setDiagnostics] = useState([]);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);
  const [diagnosticAvailability, setDiagnosticAvailability] = useState([]);
  const [updatingDiagnostic, setUpdatingDiagnostic] = useState(false);

  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceAvailability, setServiceAvailability] = useState([]);
  const [updatingService, setUpdatingService] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [filterUnread, setFilterUnread] = useState(false);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const showNotificationBanner = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 5000);
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [facRes, medRes, diagRes, srvRes, notifRes] = await Promise.all([
        listFacilities(),
        listMedicines(),
        listDiagnostics(),
        listServices(),
        listNotifications(),
      ]);

      const fList = facRes.data.data?.facilities || [];
      const mList = medRes.data.data?.medicines || [];
      const dList = diagRes.data.data?.diagnosticTests || [];
      const sList = srvRes.data.data?.services || [];
      const nList = notifRes.data.data?.notifications || [];

      setFacilities(fList);
      setMedicines(mList);
      setDiagnostics(dList);
      setServices(sList);
      setNotifications(nList);

      if (mList.length > 0) {
        selectMedicine(mList[0]);
      }
      if (dList.length > 0) {
        selectDiagnostic(dList[0]);
      }
      if (sList.length > 0) {
        selectService(sList[0]);
      }
    } catch (err) {
      console.error('Error loading resource data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Medicine Handlers ───────────────────────────────────────────────────────
  const selectMedicine = async (med) => {
    setSelectedMedicine(med);
    try {
      const res = await getMedicineAvailability(med.id);
      setMedicineAvailability(res.data.data?.availability || []);
    } catch (err) {
      console.error('Error fetching medicine availability:', err);
    }
  };

  const handleUpdateStock = async (facilityId, newQuantity) => {
    if (!selectedMedicine || newQuantity < 0) return;
    setUpdatingMedicine(true);
    try {
      await updateMedicineInventory({
        medicineId: selectedMedicine.id,
        facilityId,
        quantity: parseInt(newQuantity, 10),
      });
      // Refresh availability
      await selectMedicine(selectedMedicine);
      // Refresh notifications in case out of stock triggered alert
      const notifRes = await listNotifications();
      setNotifications(notifRes.data.data?.notifications || []);

      showNotificationBanner(
        `Updated ${selectedMedicine.name} stock to ${newQuantity} units. Smart Referral AI ranking updated in real-time!`
      );
    } catch (err) {
      console.error('Error updating inventory:', err);
    } finally {
      setUpdatingMedicine(false);
    }
  };

  // ── Diagnostic Handlers ────────────────────────────────────────────────────
  const selectDiagnostic = async (diag) => {
    setSelectedDiagnostic(diag);
    try {
      const res = await getDiagnosticAvailability(diag.id);
      setDiagnosticAvailability(res.data.data?.availability || []);
    } catch (err) {
      console.error('Error fetching diagnostic availability:', err);
    }
  };

  const handleToggleDiagnostic = async (facilityId, currentAvailable) => {
    if (!selectedDiagnostic) return;
    setUpdatingDiagnostic(true);
    const newStatus = !currentAvailable;
    try {
      await updateDiagnosticAvailability({
        testId: selectedDiagnostic.id,
        facilityId,
        available: newStatus,
      });
      await selectDiagnostic(selectedDiagnostic);
      const notifRes = await listNotifications();
      setNotifications(notifRes.data.data?.notifications || []);

      showNotificationBanner(
        `Diagnostic test "${selectedDiagnostic.name}" marked ${newStatus ? 'OPERATIONAL' : 'OUT OF SERVICE'}. Synchronized with Smart Referral AI!`
      );
    } catch (err) {
      console.error('Error toggling diagnostic:', err);
    } finally {
      setUpdatingDiagnostic(false);
    }
  };

  // ── Service Handlers ───────────────────────────────────────────────────────
  const selectService = async (srv) => {
    setSelectedService(srv);
    try {
      const res = await getServiceAvailability(srv.id);
      setServiceAvailability(res.data.data?.availability || []);
    } catch (err) {
      console.error('Error fetching service availability:', err);
    }
  };

  const handleToggleService = async (facilityId, currentAvailable) => {
    if (!selectedService) return;
    setUpdatingService(true);
    const newStatus = !currentAvailable;
    try {
      await updateServiceAvailability({
        serviceId: selectedService.id,
        facilityId,
        available: newStatus,
      });
      await selectService(selectedService);
      const notifRes = await listNotifications();
      setNotifications(notifRes.data.data?.notifications || []);

      showNotificationBanner(
        `Service "${selectedService.name}" marked ${newStatus ? 'AVAILABLE' : 'UNAVAILABLE'}. Referral eligibility filter updated!`
      );
    } catch (err) {
      console.error('Error toggling service:', err);
    } finally {
      setUpdatingService(false);
    }
  };

  // ── Notification Handlers ──────────────────────────────────────────────────
  const handleMarkNotification = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const filteredNotifications = filterUnread
    ? notifications.filter((n) => !n.readAt)
    : notifications;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            Resource & Availability Management
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              Shruti (Module 6) 🤝 Ayush (Module 4)
            </span>
          </h1>
          <p className="text-sm text-stone-500">
            Real-time control over hospital medicine stock, diagnostic equipment, healthcare services, and system alert notifications.
          </p>
        </div>
        <button
          onClick={loadInitialData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {/* Synergistic Connection Banner */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-950">Interconnected Real-Time Pipeline Active</div>
            <div className="text-[11px] text-emerald-800">
              Changes you make below to medicine quantity or machine availability immediately change the recommendation ranking in Ayush's Smart Referral AI.
            </div>
          </div>
        </div>
      </div>

      {/* Action Toast Alert */}
      {actionMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-1">
        <button
          onClick={() => setActiveTab('medicines')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'medicines'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Medicines & Inventory</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-mono">
            {medicines.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'diagnostics'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Diagnostic Equipment</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-mono">
            {diagnostics.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'services'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Healthcare Services</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 font-mono">
            {services.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-stone-600 hover:text-stone-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>System Alerts</span>
          {notifications.filter((n) => !n.readAt).length > 0 && (
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 font-semibold font-mono">
              {notifications.filter((n) => !n.readAt).length}
            </span>
          )}
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: MEDICINES & INVENTORY                                           */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'medicines' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Medicine List */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Master Medicine List</h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {medicines.map((m) => {
                const isSelected = selectedMedicine?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => selectMedicine(m)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-800">{m.name}</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200">
                        {m.strength || 'Standard'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex items-center justify-between">
                      <span>{m.form || 'Tablet'}</span>
                      <span className="text-[11px] text-stone-400 truncate max-w-[120px]">{m.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facility Stock for Selected Medicine */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
            {selectedMedicine ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                      <Pill className="w-5 h-5 text-emerald-600" />
                      {selectedMedicine.name} ({selectedMedicine.strength})
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">Facility stock levels and live replenishment</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {facilities.map((fac) => {
                    const invRecord = medicineAvailability.find((a) => a.facility?.id === fac.id);
                    const qty = invRecord ? invRecord.quantity : 0;
                    const isOutOfStock = qty === 0;

                    return (
                      <div
                        key={fac.id}
                        className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isOutOfStock ? 'bg-red-50/40 border-red-200' : 'bg-white border-stone-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-stone-500" />
                            <span className="text-sm font-medium text-stone-800">{fac.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                              {fac.type?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            District: {fac.district} · Status:{' '}
                            <span className={isOutOfStock ? 'text-red-600 font-bold' : 'text-emerald-700 font-semibold'}>
                              {isOutOfStock ? 'OUT OF STOCK (Alert Active)' : `${qty} units available`}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(fac.id, Math.max(0, qty - 10))}
                            disabled={updatingMedicine}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded"
                          >
                            -10
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={qty}
                            onChange={(e) => handleUpdateStock(fac.id, e.target.value)}
                            className="w-16 px-2 py-1 text-xs text-center border border-stone-300 rounded font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(fac.id, qty + 10)}
                            disabled={updatingMedicine}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded"
                          >
                            +10
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStock(fac.id, 0)}
                            disabled={updatingMedicine}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded"
                            title="Simulate Out of Stock"
                          >
                            Set 0
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400">Select a medicine to view stock</div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: DIAGNOSTIC EQUIPMENT                                            */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Diagnostic List */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Diagnostic Tests</h3>
            <div className="space-y-1.5">
              {diagnostics.map((d) => {
                const isSelected = selectedDiagnostic?.id === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => selectDiagnostic(d)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-800">{d.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200">
                        {d.category || 'Diagnostic'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{d.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facility Status for Selected Diagnostic */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
            {selectedDiagnostic ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-600" />
                      {selectedDiagnostic.name} Equipment Readiness
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Toggle whether the machine is operational or broken. Smart Referral AI will adjust diagnostic scores.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {facilities.map((fac) => {
                    const isAvail = diagnosticAvailability.some((a) => a.facilityId === fac.id && a.available);

                    return (
                      <div
                        key={fac.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between transition-colors ${
                          isAvail ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50/30 border-red-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-stone-500" />
                            <span className="text-sm font-medium text-stone-800">{fac.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                              {fac.type?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            Status:{' '}
                            <span className={isAvail ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {isAvail ? 'OPERATIONAL' : 'OUT OF SERVICE (Machine Down)'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleDiagnostic(fac.id, isAvail)}
                          disabled={updatingDiagnostic}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                            isAvail
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isAvail ? 'Mark Broken' : 'Mark Operational'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400">Select a diagnostic test</div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: HEALTHCARE SERVICES                                             */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Services List */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Healthcare Services</h3>
            <div className="space-y-1.5">
              {services.map((s) => {
                const isSelected = selectedService?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectService(s)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-800">{s.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white text-stone-600 border border-stone-200">
                        {s.category || 'Clinical'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1">{s.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facility Service Availability */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-5">
            {selectedService ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                      <Stethoscope className="w-5 h-5 text-emerald-600" />
                      {selectedService.name} Service Availability
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Marking a service unavailable filters out this facility from Ayush's Smart Referral recommendations.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {facilities.map((fac) => {
                    const isAvail = serviceAvailability.some((a) => a.facility?.id === fac.id && a.available);

                    return (
                      <div
                        key={fac.id}
                        className={`p-3.5 rounded-lg border flex items-center justify-between transition-colors ${
                          isAvail ? 'bg-emerald-50/30 border-emerald-200' : 'bg-red-50/30 border-red-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-stone-500" />
                            <span className="text-sm font-medium text-stone-800">{fac.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                              {fac.type?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500 mt-1">
                            Operational Status:{' '}
                            <span className={isAvail ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                              {isAvail ? 'ACTIVE & OPERATIONAL' : 'UNAVAILABLE (Temporarily Closed)'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleService(fac.id, isAvail)}
                          disabled={updatingService}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                            isAvail
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {isAvail ? 'Mark Unavailable' : 'Mark Available'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400">Select a service</div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: SYSTEM NOTIFICATIONS & ALERTS                                  */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Live System Alerts & Notifications
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically triggered when medicine runs out, machines break down, or referrals are created.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filterUnread}
                onChange={(e) => setFilterUnread(e.target.checked)}
                className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              Show Unread Only
            </label>
          </div>

          <div className="space-y-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-sm">No notifications found</div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = Boolean(notif.readAt);
                const isUrgent = notif.priority === 'HIGH' || notif.priority === 'URGENT';

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 transition-colors ${
                      isRead
                        ? 'bg-stone-50/60 border-stone-200 opacity-75'
                        : isUrgent
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            notif.priority === 'URGENT' || notif.priority === 'HIGH'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {notif.priority}
                        </span>
                        <span className="text-xs font-semibold text-stone-800">{notif.title}</span>
                        <span className="text-[11px] text-stone-400">
                          {new Date(notif.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600">{notif.message}</p>
                    </div>

                    {!isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotification(notif.id)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 shrink-0"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
