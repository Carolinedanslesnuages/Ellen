/**
 * The Hub'Eau calls: drinking water, groundwater, rivers, dry rivers (Onde network).
 * Each function returns Hub'Eau's own items, untouched: { total, items } (see readers.mjs to read them).
 * Dates are « YYYY-MM-DD ». « bbox » is [west, south, east, north] in WGS84 degrees.
 * « signal » (an AbortSignal) cancels a request that is no longer needed.
 */

/** Drinking water distribution networks (UDI) serving a commune. */
export function drinkingWaterNetworks(requestList, { communeCode, year, size = 20, signal }) {
  return requestList('/v1/qualite_eau_potable/communes_udi', { code_commune: communeCode, annee: year, size, sort: 'desc' }, { signal });
}

/** Drinking water test results in a commune, most recent first. */
export function drinkingWaterResults(requestList, { communeCode, since, until, parameterLabel, size = 20, signal }) {
  return requestList('/v1/qualite_eau_potable/resultats_dis', {
    code_commune: communeCode,
    date_min_prelevement: since && `${since} 00:00:00`,
    date_max_prelevement: until && `${until} 23:59:59`,
    libelle_parametre: parameterLabel,
    size,
    sort: 'desc',
  }, { signal });
}

/** Groundwater monitoring wells (piezometers). */
export function groundwaterStations(requestList, { departmentCode, communeCode, bbox, measuredOnly = true, size = 20, signal }) {
  return requestList('/v1/niveaux_nappes/stations', {
    code_departement: departmentCode,
    code_commune: communeCode,
    bbox,
    nb_mesures_piezo_min: measuredOnly ? 1 : undefined,
    size,
  }, { signal });
}

/** Groundwater levels of a well, most recent first: recent readings, or the validated history. */
export function groundwaterLevels(requestList, { bssCode, since, until, history = false, size = 20, signal }) {
  return requestList(`/v1/niveaux_nappes/${history ? 'chroniques' : 'chroniques_tr'}`, {
    code_bss: bssCode,
    date_debut_mesure: since,
    date_fin_mesure: until,
    size,
    sort: 'desc',
  }, { signal });
}

/**
 * River gauging stations. « name » is looked for anywhere in the station label (« La Vilaine à
 * Rennes »), without regard to case: the river field of the reference is often empty.
 */
export function riverStations(requestList, { departmentCode, communeCode, name, bbox, inService = true, size = 20, signal }) {
  return requestList('/v2/hydrometrie/referentiel/stations', {
    code_departement: departmentCode,
    code_commune_station: communeCode,
    libelle_station: name && `*${name.replaceAll('*', '')}*`,
    bbox,
    en_service: inService ? 1 : undefined,
    size,
  }, { signal });
}

/** Real-time river readings (last month at most), most recent first: height « H » (mm) or flow « Q » (l/s). */
export function riverReadings(requestList, { entityCode, quantity = 'Q', since, size = 20, signal }) {
  return requestList('/v2/hydrometrie/observations_tr', { code_entite: entityCode, grandeur_hydro: quantity, date_debut_obs: since, size, sort: 'desc' }, { signal });
}

/** Daily mean flows (l/s), oldest first. */
export function riverDailyFlows(requestList, { entityCode, since, until, size = 31, signal }) {
  return requestList('/v2/hydrometrie/obs_elab', {
    code_entite: entityCode,
    grandeur_hydro_elab: 'QmnJ',
    date_debut_obs_elab: since,
    date_fin_obs_elab: until,
    size,
  }, { signal });
}

/** Onde stations: the small streams whose flow observers note (to place them on a map). */
export function dryRiverStations(requestList, { departmentCode, bbox, size = 50, signal }) {
  return requestList('/v1/ecoulement/stations', { code_departement: departmentCode, bbox, size }, { signal });
}

/** Dry river observations (Onde network), most recent first. */
export function dryRiverObservations(requestList, { departmentCode, stationCode, bbox, since, until, flowCode, size = 50, signal }) {
  return requestList('/v1/ecoulement/observations', {
    code_departement: departmentCode,
    code_station: stationCode,
    bbox,
    date_observation_min: since,
    date_observation_max: until,
    code_ecoulement: flowCode,
    size,
    sort: 'desc',
  }, { signal });
}
