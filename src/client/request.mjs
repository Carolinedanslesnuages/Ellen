/**
 * One GET request to a public API, with French error messages. Works in Node 20+ and in browsers
 * (fetch and URLSearchParams only): Hub'Eau and the API Géo both allow calls from any web page.
 */
export const HUBEAU_ADDRESS = 'https://hubeau.eaufrance.fr/api';
const TIMEOUT_MS = 20_000;

export class WaterDataError extends Error {
  constructor(message, { status = null, address = '' } = {}) {
    super(message);
    this.name = 'WaterDataError';
    this.status = status;
    this.address = address;
  }
}

/** Query string without empty values: undefined, null and '' are left out. */
export function queryOf(params = {}) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(name, String(value));
  }
  return query.toString();
}

export function createRequester({ fetchImpl = globalThis.fetch, baseAddress = HUBEAU_ADDRESS } = {}) {
  if (typeof fetchImpl !== 'function') throw new WaterDataError('Aucune fonction fetch disponible : Node 20 ou plus, ou un navigateur récent.');

  /** Hub'Eau answers 200 (everything) or 206 (one page of more): both are results. */
  async function requestJson(address) {
    let response;
    try {
      response = await fetchImpl(address, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      throw new WaterDataError(`Service injoignable (${error.message}).`, { address });
    }
    if (response.status === 204) return null;
    if (!response.ok) throw new WaterDataError(`Le service a répondu ${response.status}.`, { status: response.status, address });
    try {
      return await response.json();
    } catch {
      throw new WaterDataError('Réponse illisible du service (pas du JSON).', { status: response.status, address });
    }
  }

  /** A Hub'Eau list: { total, items }. */
  async function requestList(path, params) {
    const query = queryOf(params);
    const page = await requestJson(`${baseAddress}${path}${query ? `?${query}` : ''}`);
    if (!page) return { total: 0, items: [] };
    return { total: page.count ?? page.data?.length ?? 0, items: page.data ?? [] };
  }

  return { requestJson, requestList };
}
