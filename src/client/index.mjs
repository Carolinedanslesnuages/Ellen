/**
 * The water data client: Hub'Eau (drinking water, groundwater, rivers, dry rivers) and the API Géo
 * (communes, to find the INSEE codes Hub'Eau expects). No dependency: Node 20+ or a browser.
 *
 *   import { createWaterClient } from 'ellen/client';
 *   const water = createWaterClient();
 *   const { items } = await water.dryRiverObservations({ departmentCode: '35', flowCode: '3' });
 */
import { createRequester, queryOf } from './request.mjs';
import * as water from './water.mjs';

export { WaterDataError, HUBEAU_ADDRESS } from './request.mjs';
export { FLOW_STATES } from './water.mjs';

const GEO_ADDRESS = 'https://geo.api.gouv.fr';

export function createWaterClient({ fetchImpl = globalThis.fetch, baseAddress } = {}) {
  const { requestJson, requestList } = createRequester({ fetchImpl, baseAddress });
  const bind = (call) => (options = {}) => call(requestList, options);
  return {
    drinkingWaterNetworks: bind(water.drinkingWaterNetworks),
    drinkingWaterResults: bind(water.drinkingWaterResults),
    groundwaterStations: bind(water.groundwaterStations),
    groundwaterLevels: bind(water.groundwaterLevels),
    riverStations: bind(water.riverStations),
    riverReadings: bind(water.riverReadings),
    riverDailyFlows: bind(water.riverDailyFlows),
    dryRiverObservations: bind(water.dryRiverObservations),

    /** Communes matching a name, the most populated first (API Géo). */
    async findCommunes({ name, size = 5 }) {
      const query = queryOf({ nom: name, fields: 'nom,code,codeDepartement,codesPostaux,population,centre', boost: 'population', limit: size });
      return (await requestJson(`${GEO_ADDRESS}/communes?${query}`)) ?? [];
    },
  };
}
