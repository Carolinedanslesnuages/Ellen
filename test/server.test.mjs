import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createServer } from '../src/server/protocol.mjs';
import { allTools } from '../src/server/tools/index.mjs';
import { groupBySample } from '../src/server/tools/drinking-water.mjs';
import { onePerDate } from '../src/server/tools/rivers.mjs';
import { daysAgo } from '../src/server/arguments.mjs';

/** A client that answers every call with the given items, and remembers the options. */
function fakeClient(itemsByCall = {}) {
  const calls = [];
  const answer = (name) => async (options) => {
    calls.push({ name, options });
    const items = itemsByCall[name] ?? [];
    return name === 'findCommunes' ? items : { total: items.length, items };
  };
  const names = ['drinkingWaterNetworks', 'drinkingWaterResults', 'groundwaterStations', 'groundwaterLevels', 'riverStations', 'riverReadings', 'riverDailyFlows', 'dryRiverObservations', 'findCommunes'];
  return { client: Object.fromEntries(names.map((name) => [name, answer(name)])), calls };
}

function serverWith(itemsByCall) {
  const { client, calls } = fakeClient(itemsByCall);
  const server = createServer({ name: 'ellen', version: '0.0.0', instructions: 'essai', tools: allTools(client, { today: () => new Date('2026-10-31T12:00:00Z') }) });
  const call = async (name, args) => (await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })).result;
  return { server, call, calls };
}

test('initialize answers with the client version when supported, otherwise the latest', async () => {
  const { server } = serverWith();
  const known = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
  assert.equal(known.result.protocolVersion, '2025-06-18');
  assert.deepEqual(known.result.serverInfo, { name: 'ellen', version: '0.0.0' });
  const unknown = await server.handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.equal(unknown.result.protocolVersion, '2025-11-25');
  assert.equal(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null, 'no answer to a notification');
  assert.equal((await server.handle({ jsonrpc: '2.0', id: 3, method: 'nope' })).error.code, -32601);
});

test('lists nine tools, each with a French description and an object schema', async () => {
  const { tools } = (await serverWith().server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' })).result;
  assert.equal(tools.length, 9);
  for (const tool of tools) {
    assert.match(tool.name, /^[a-z_]+$/);
    assert.equal(tool.inputSchema.type, 'object');
    assert.ok(tool.description.length > 40, tool.name);
  }
});

test('a bad argument is a tool error the agent can read, not a protocol error', async () => {
  const { call } = serverWith();
  const result = await call('eau_potable_analyses', { code_commune: 'Rennes' });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /code_commune.*invalide.*trouver_commune/);
  assert.match((await call('nappes_stations', {})).content[0].text, /au moins un de ces arguments/);
});

test('drinking water: results grouped by sample, networks of the latest year', async () => {
  const sample = (code, parameter) => ({ code_prelevement: code, date_prelevement: '2026-09-29T14:03:00Z', libelle_parametre: parameter, resultat_numerique: 21, libelle_unite: 'mg/L', conclusion_conformite_prelevement: 'Conforme' });
  assert.equal(groupBySample([sample('A', 'Nitrates'), sample('A', 'pH'), sample('B', 'pH')]).length, 2);
  const { call } = serverWith({ drinkingWaterNetworks: [{ nom_reseau: 'R', annee: '2026', nom_quartier: '-' }, { nom_reseau: 'R', annee: '2025' }] });
  const { reseaux } = (await call('eau_potable_reseaux', { code_commune: '35238' })).structuredContent;
  assert.deepEqual(reseaux, [{ reseau: 'R', code_reseau: undefined, quartier: null, annee: '2026' }]);
});

test('rivers: one reading per date (the station’s), mm and l/s turned into m and m³/s, 30 days by default', async () => {
  const site = { date_obs: 'T1', code_station: null, resultat_obs: 3100 };
  const station = { date_obs: 'T1', code_station: 'I912201002', resultat_obs: 3100 };
  assert.deepEqual(onePerDate([site, station], 'date_obs'), [station]);
  const { call, calls } = serverWith({ riverReadings: [site, station, { date_obs: 'T0', code_station: 'I912201002', resultat_obs: 2950 }] });
  const { mesures } = (await call('riviere_temps_reel', { code: 'I9122010', grandeur: 'hauteur' })).structuredContent;
  assert.deepEqual(mesures, [{ date: 'T1', station: 'I912201002', hauteur_m: 3.1 }, { date: 'T0', station: 'I912201002', hauteur_m: 2.95 }]);
  assert.equal(calls[0].options.quantity, 'H');
  await call('riviere_debits_journaliers', { code: 'I9122010' });
  assert.equal(calls[1].options.since, '2026-10-01');
  assert.equal(daysAgo(30, new Date('2026-10-31T12:00:00Z')), '2026-10-01');
});

test('dry rivers: Onde codes read as words, and counted', async () => {
  const { call, calls } = serverWith({ dryRiverObservations: [{ code_ecoulement: '3' }, { code_ecoulement: '3' }, { code_ecoulement: '1a' }] });
  const result = (await call('assecs_observations', { code_departement: '35', etat: 'assec' })).structuredContent;
  assert.deepEqual(result.decompte, { Assec: 2, 'Écoulement visible acceptable': 1 });
  assert.equal(calls[0].options.flowCode, '3');
});

test('speaks JSON-RPC over a stream: one answer per request line, a parse error for bad JSON', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const { server } = serverWith();
  const chunks = [];
  output.on('data', (chunk) => chunks.push(chunk));
  const done = server.listen(input, output);
  input.end(['{"jsonrpc":"2.0","id":1,"method":"ping"}', 'pas du json', '{"jsonrpc":"2.0","method":"notifications/initialized"}', ''].join('\n'));
  await done;
  const answers = Buffer.concat(chunks).toString().trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(answers, [{ jsonrpc: '2.0', id: 1, result: {} }, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON illisible.' } }]);
});
