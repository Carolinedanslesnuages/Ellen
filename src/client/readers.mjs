/**
 * Reading Hub'Eau items: units people read (metres, m³/s), one reading per date, Onde states in
 * words, drinking water results by sample. Pure functions, shared by the MCP server and the
 * applications that use the client.
 */

/** Onde codes: what an observer saw in the stream bed. */
export const FLOW_STATES = {
  '1a': 'Écoulement visible acceptable',
  '1f': 'Écoulement visible faible',
  2: 'Écoulement non visible',
  3: 'Assec',
};

/** Rounded number, or null when the source has none. */
export const rounded = (value, digits = 3) => (typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : null);

/** Hub'Eau heights are in millimetres, flows in litres per second: both divide by 1000. */
export const metresFromMillimetres = (millimetres) => rounded(millimetres / 1000);
export const cubicMetresFromLitres = (litresPerSecond) => rounded(litresPerSecond / 1000);

/**
 * A site code returns its own series and those of its stations: one reading per date is kept,
 * the station's when there is one.
 */
export function onePerDate(items, dateField) {
  const byDate = new Map();
  for (const item of items) {
    const kept = byDate.get(item[dateField]);
    if (!kept || (!kept.code_station && item.code_station)) byDate.set(item[dateField], item);
  }
  return [...byDate.values()];
}

/** Real-time readings, in metres (height « H ») or m³/s (flow « Q »), one per date. */
export function readRiverReadings(items, quantity = 'Q') {
  const convert = quantity === 'H' ? metresFromMillimetres : cubicMetresFromLitres;
  return onePerDate(items, 'date_obs').map((item) => ({ date: item.date_obs, station: item.code_station, value: convert(item.resultat_obs) }));
}

/** Daily mean flows in m³/s, one per day. */
export function readDailyFlows(items) {
  return onePerDate(items, 'date_obs_elab').map((item) => ({
    date: item.date_obs_elab,
    station: item.code_station,
    value: cubicMetresFromLitres(item.resultat_obs_elab),
    status: item.libelle_statut,
  }));
}

/** The words of an Onde state, from its code. */
export const flowStateOf = (item) => FLOW_STATES[item.code_ecoulement] ?? item.libelle_ecoulement ?? null;

/** Drinking water results of the same sample together: one date, one verdict, several measures. */
export function groupBySample(items) {
  const samples = new Map();
  for (const item of items) {
    if (!samples.has(item.code_prelevement)) {
      samples.set(item.code_prelevement, {
        date: item.date_prelevement,
        network: item.nom_uge ?? null,
        distributor: item.nom_distributeur ?? null,
        conclusion: item.conclusion_conformite_prelevement ?? null,
        measures: [],
      });
    }
    samples.get(item.code_prelevement).measures.push({
      parameter: item.libelle_parametre,
      result: item.resultat_alphanumerique ?? item.resultat_numerique,
      unit: item.libelle_unite === 'SANS OBJET' ? null : item.libelle_unite ?? null,
      qualityLimit: item.limite_qualite_parametre ?? null,
      qualityReference: item.reference_qualite_parametre ?? null,
    });
  }
  return [...samples.values()];
}
