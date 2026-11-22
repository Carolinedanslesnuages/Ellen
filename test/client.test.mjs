import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWaterClient, WaterDataError, FLOW_STATES, onePerDate, readRiverReadings, readDailyFlows, flowStateOf, groupBySample } from '../src/client/index.mjs';

/** A fake fetch that records the addresses and answers with the given status and body. */
function fakeFetch(answer = { status: 200, body: { count: 0, data: [] } }) {
  const calls = [];
  const fetchImpl = async (address) => {
    calls.push(new URL(address));
    const { status, body } = typeof answer === 'function' ? answer(new URL(address)) : answer;
    return new Response(status === 204 ? null : typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  return { fetchImpl, calls };
}

test('builds Hub’Eau queries without empty values, and the dates Hub’Eau expects', async () => {
  const { fetchImpl, calls } = fakeFetch({ status: 206, body: { count: 143, data: [{ code_prelevement: 'P1' }] } });
  const water = createWaterClient({ fetchImpl });
  const result = await water.drinkingWaterResults({ communeCode: '35238', since: '2026-09-01', size: 5 });
  assert.deepEqual(result, { total: 143, items: [{ code_prelevement: 'P1' }] }, '206 is one page of results');
  const [address] = calls;
  assert.equal(address.pathname, '/api/v1/qualite_eau_potable/resultats_dis');
  assert.equal(address.searchParams.get('date_min_prelevement'), '2026-09-01 00:00:00');
  assert.equal(address.searchParams.get('sort'), 'desc');
  assert.ok(!address.searchParams.has('libelle_parametre'), 'no empty parameter');
});

test('reaches each Hub’Eau service with its own path', async () => {
  const { fetchImpl, calls } = fakeFetch();
  const water = createWaterClient({ fetchImpl });
  await water.drinkingWaterNetworks({ communeCode: '35238' });
  await water.groundwaterStations({ departmentCode: '35' });
  await water.groundwaterLevels({ bssCode: '02465X0061/F' });
  await water.groundwaterLevels({ bssCode: '02465X0061/F', history: true });
  await water.riverStations({ name: 'Vilaine' });
  await water.riverReadings({ entityCode: 'I9122010', quantity: 'H' });
  await water.riverDailyFlows({ entityCode: 'I9122010' });
  await water.dryRiverObservations({ departmentCode: '35', flowCode: '3' });
  assert.deepEqual(calls.map((address) => address.pathname.replace('/api/', '')), [
    'v1/qualite_eau_potable/communes_udi',
    'v1/niveaux_nappes/stations',
    'v1/niveaux_nappes/chroniques_tr',
    'v1/niveaux_nappes/chroniques',
    'v2/hydrometrie/referentiel/stations',
    'v2/hydrometrie/observations_tr',
    'v2/hydrometrie/obs_elab',
    'v1/ecoulement/observations',
  ]);
  assert.equal(calls[1].searchParams.get('nb_mesures_piezo_min'), '1', 'only wells with readings');
  assert.equal(calls[2].searchParams.get('code_bss'), '02465X0061/F');
  assert.equal(calls[4].searchParams.get('libelle_station'), '*Vilaine*', 'river name searched in the station label');
  assert.equal(calls[5].searchParams.get('grandeur_hydro'), 'H');
  assert.equal(calls[6].searchParams.get('grandeur_hydro_elab'), 'QmnJ');
  assert.equal(calls[7].searchParams.get('code_ecoulement'), '3');
  assert.equal(FLOW_STATES[3], 'Assec');
});

test('finds communes with the API Géo', async () => {
  const { fetchImpl, calls } = fakeFetch({ status: 200, body: [{ nom: 'Rennes', code: '35238' }] });
  const communes = await createWaterClient({ fetchImpl }).findCommunes({ name: 'Rennes', size: 2 });
  assert.equal(communes[0].code, '35238');
  assert.equal(calls[0].host, 'geo.api.gouv.fr');
  assert.equal(calls[0].searchParams.get('limit'), '2');
});

test('204 is an empty list; other failures are WaterDataError with a French message', async () => {
  assert.deepEqual(await createWaterClient(fakeFetch({ status: 204 })).riverStations({ departmentCode: '35' }), { total: 0, items: [] });
  await assert.rejects(createWaterClient(fakeFetch({ status: 502, body: '<html>' })).riverStations({}), (error) => error instanceof WaterDataError && error.status === 502 && /répondu 502/.test(error.message));
  await assert.rejects(createWaterClient(fakeFetch({ status: 200, body: '<html>' })).riverStations({}), /pas du JSON/);
  const offline = createWaterClient({ fetchImpl: async () => { throw new Error('ENOTFOUND'); } });
  await assert.rejects(offline.riverStations({}), /injoignable \(ENOTFOUND\)/);
});

test('a bbox and a cancellation signal reach Hub’Eau; a cancelled request is not a service failure', async () => {
  const { fetchImpl, calls } = fakeFetch();
  const water = createWaterClient({ fetchImpl });
  await water.dryRiverStations({ bbox: [-1.8, 48.0, -1.5, 48.2] });
  assert.equal(calls[0].pathname, '/api/v1/ecoulement/stations');
  assert.equal(calls[0].searchParams.get('bbox'), '-1.8,48,-1.5,48.2', '[west, south, east, north], as Anita writes it');

  const controller = new AbortController();
  const waiting = createWaterClient({
    fetchImpl: (address, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
  }).riverStations({ departmentCode: '35', signal: controller.signal });
  controller.abort();
  await assert.rejects(waiting, (error) => error.name === 'AbortError' && !(error instanceof WaterDataError));
});

test('readers: one reading per date (the station’s), metres and m³/s, Onde states, samples', () => {
  const site = { date_obs: 'T1', code_station: null, resultat_obs: 3100 };
  const station = { date_obs: 'T1', code_station: 'I912201002', resultat_obs: 3100 };
  assert.deepEqual(onePerDate([site, station], 'date_obs'), [station]);
  assert.deepEqual(readRiverReadings([site, station], 'H'), [{ date: 'T1', station: 'I912201002', value: 3.1 }]);
  assert.deepEqual(readDailyFlows([{ date_obs_elab: 'J1', code_station: 'S', resultat_obs_elab: 687, libelle_statut: 'Donnée brute' }]), [{ date: 'J1', station: 'S', value: 0.687, status: 'Donnée brute' }]);
  assert.equal(flowStateOf({ code_ecoulement: '1f' }), 'Écoulement visible faible');
  const sample = (code, parameter) => ({ code_prelevement: code, libelle_parametre: parameter, resultat_numerique: 21, libelle_unite: 'SANS OBJET' });
  const samples = groupBySample([sample('A', 'Nitrates'), sample('A', 'pH'), sample('B', 'pH')]);
  assert.equal(samples.length, 2);
  assert.deepEqual(samples[0].measures.map((measure) => [measure.parameter, measure.unit]), [['Nitrates', null], ['pH', null]]);
});
