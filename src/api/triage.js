import api from './axios';

/**
 * Run clinical triage assessment for an encounter or ad-hoc vitals/symptoms.
 * @param {string} encounterId - ID of existing encounter or 'adhoc'
 * @param {object} data - { vitals, symptoms, patientId }
 */
export const assessEncounterTriage = (encounterId = 'adhoc', data = {}) =>
  api.post(`/triage/${encounterId}`, data);

/**
 * Run triage assessment and automatically generate Smart Referral if HIGH or EMERGENCY.
 * @param {string} encounterId - ID of existing encounter
 * @param {object} data - { patientLatitude, patientLongitude, referringFacilityId, requiredService, requiredSpecialist, requiredDiagnostics, requiredMedicines, reason, vitals, symptoms }
 */
export const assessAndRefer = (encounterId, data = {}) =>
  api.post(`/triage/${encounterId}/refer`, data);
