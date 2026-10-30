/** Types of the water data client, for TypeScript projects (Anita, for example). */

export declare const HUBEAU_ADDRESS: string;

export declare const FLOW_STATES: Readonly<Record<'1a' | '1f' | '2' | '3', string>>;

export declare class WaterDataError extends Error {
  status: number | null;
  address: string;
}

/** A Hub'Eau list: the total number of matches, and the items of this page (Hub'Eau's own fields). */
export interface WaterList<Item = Record<string, unknown>> {
  total: number;
  items: Item[];
}

/** Dates are « YYYY-MM-DD ». */
type IsoDate = string;

export interface Commune {
  nom: string;
  code: string;
  codeDepartement: string;
  codesPostaux: string[];
  population?: number;
  centre?: { type: 'Point'; coordinates: [number, number] };
}

export interface WaterClient {
  drinkingWaterNetworks(options: { communeCode: string; year?: number; size?: number }): Promise<WaterList>;
  drinkingWaterResults(options: { communeCode: string; since?: IsoDate; until?: IsoDate; parameterLabel?: string; size?: number }): Promise<WaterList>;
  groundwaterStations(options: { departmentCode?: string; communeCode?: string; measuredOnly?: boolean; size?: number }): Promise<WaterList>;
  groundwaterLevels(options: { bssCode: string; since?: IsoDate; until?: IsoDate; history?: boolean; size?: number }): Promise<WaterList>;
  /** « name » is looked for in the station label (« La Vilaine à Rennes »), whatever the case. */
  riverStations(options: { departmentCode?: string; communeCode?: string; name?: string; inService?: boolean; size?: number }): Promise<WaterList>;
  /** Height « H » in millimetres, flow « Q » in litres per second. */
  riverReadings(options: { entityCode: string; quantity?: 'H' | 'Q'; since?: IsoDate; size?: number }): Promise<WaterList>;
  /** Daily mean flows, in litres per second. */
  riverDailyFlows(options: { entityCode: string; since?: IsoDate; until?: IsoDate; size?: number }): Promise<WaterList>;
  dryRiverObservations(options: { departmentCode?: string; stationCode?: string; since?: IsoDate; until?: IsoDate; flowCode?: '1a' | '1f' | '2' | '3'; size?: number }): Promise<WaterList>;
  findCommunes(options: { name: string; size?: number }): Promise<Commune[]>;
}

export declare function createWaterClient(options?: { fetchImpl?: typeof fetch; baseAddress?: string }): WaterClient;
