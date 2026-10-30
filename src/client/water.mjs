/**
 * The Hub'Eau calls: drinking water, groundwater, rivers, dry rivers (Onde network).
 * Each function returns Hub'Eau's own items, untouched: { total, items }.
 * Dates are « YYYY-MM-DD ». Heights are in millimetres and flows in litres per second (Hub'Eau units).
 */

/** Drinking water distribution networks (UDI) serving a commune. */
export function drinkingWaterNetworks(requestList, { communeCode, year, size = 20 }) {
  return requestList('/v1/qualite_eau_potable/communes_udi', { code_commune: communeCode, annee: year, size, sort: 'desc' });
}

/** Drinking water test results in a commune, most recent first. */
export function drinkingWaterResults(requestList, { communeCode, since, until, parameterLabel, size = 20 }) {
  return requestList('/v1/qualite_eau_potable/resultats_dis', {
    code_commune: communeCode,
    date_min_prelevement: since && `${since} 00:00:00`,
    date_max_prelevement: until && `${until} 23:59:59`,
    libelle_parametre: parameterLabel,
    size,
    sort: 'desc',
  });
}

/** Groundwater monitoring wells (piezometers). */
export function groundwaterStations(requestList, { departmentCode, communeCode, measuredOnly = true, size = 20 }) {
  return requestList('/v1/niveaux_nappes/stations', {
    code_departement: departmentCode,
    code_commune: communeCode,
    nb_mesures_piezo_min: measuredOnly ? 1 : undefined,
    size,
  });
}

/** Groundwater levels of a well, most recent first: recent readings, or the validated history. */
export function groundwaterLevels(requestList, { bssCode, since, until, history = false, size = 20 }) {
  return requestList(`/v1/niveaux_nappes/${history ? 'chroniques' : 'chroniques_tr'}`, {
    code_bss: bssCode,
    date_debut_mesure: since,
    date_fin_mesure: until,
    size,
    sort: 'desc',
  });
}

/**
 * River gauging stations. « name » is looked for anywhere in the station label (« La Vilaine à
 * Rennes »), without regard to case: the river field of the reference is often empty.
 */
export function riverStations(requestList, { departmentCode, communeCode, name, inService = true, size = 20 }) {
  return requestList('/v2/hydrometrie/referentiel/stations', {
    code_departement: departmentCode,
    code_commune_station: communeCode,
    libelle_station: name && `*${name.replaceAll('*', '')}*`,
    en_service: inService ? 1 : undefined,
    size,
  });
}

/** Real-time river readings (last month at most), most recent first: height « H » (mm) or flow « Q » (l/s). */
export function riverReadings(requestList, { entityCode, quantity = 'Q', since, size = 20 }) {
  return requestList('/v2/hydrometrie/observations_tr', { code_entite: entityCode, grandeur_hydro: quantity, date_debut_obs: since, size, sort: 'desc' });
}

/** Daily mean flows (l/s), oldest first. */
export function riverDailyFlows(requestList, { entityCode, since, until, size = 31 }) {
  return requestList('/v2/hydrometrie/obs_elab', {
    code_entite: entityCode,
    grandeur_hydro_elab: 'QmnJ',
    date_debut_obs_elab: since,
    date_fin_obs_elab: until,
    size,
  });
}

/** Onde codes: what an observer saw in the stream bed. */
export const FLOW_STATES = {
  '1a': 'Écoulement visible acceptable',
  '1f': 'Écoulement visible faible',
  2: 'Écoulement non visible',
  3: 'Assec',
};

/** Dry river observations (Onde network), most recent first. */
export function dryRiverObservations(requestList, { departmentCode, stationCode, since, until, flowCode, size = 50 }) {
  return requestList('/v1/ecoulement/observations', {
    code_departement: departmentCode,
    code_station: stationCode,
    date_observation_min: since,
    date_observation_max: until,
    code_ecoulement: flowCode,
    size,
    sort: 'desc',
  });
}
