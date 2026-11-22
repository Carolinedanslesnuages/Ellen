/** Types of the water data client, for TypeScript projects (Anita, for example). */

export declare const HUBEAU_ADDRESS: string;

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

/** [west, south, east, north] in WGS84 degrees: the order of Anita's « Limites ». */
export type BoundingBox = [number, number, number, number];

/** Options every call accepts: a signal cancels a request that is no longer needed. */
interface Cancellable {
  signal?: AbortSignal;
}

export type FlowCode = '1a' | '1f' | '2' | '3';

export interface Commune {
  nom: string;
  code: string;
  codeDepartement: string;
  codesPostaux: string[];
  population?: number;
  centre?: { type: 'Point'; coordinates: [number, number] };
}

export interface WaterClient {
  drinkingWaterNetworks(options: Cancellable & { communeCode: string; year?: number; size?: number }): Promise<WaterList>;
  drinkingWaterResults(options: Cancellable & { communeCode: string; since?: IsoDate; until?: IsoDate; parameterLabel?: string; size?: number }): Promise<WaterList>;
  groundwaterStations(options: Cancellable & { departmentCode?: string; communeCode?: string; bbox?: BoundingBox; measuredOnly?: boolean; size?: number }): Promise<WaterList>;
  groundwaterLevels(options: Cancellable & { bssCode: string; since?: IsoDate; until?: IsoDate; history?: boolean; size?: number }): Promise<WaterList>;
  /** « name » is looked for in the station label (« La Vilaine à Rennes »), whatever the case. */
  riverStations(options: Cancellable & { departmentCode?: string; communeCode?: string; name?: string; bbox?: BoundingBox; inService?: boolean; size?: number }): Promise<WaterList>;
  /** Height « H » in millimetres, flow « Q » in litres per second (see readRiverReadings). */
  riverReadings(options: Cancellable & { entityCode: string; quantity?: 'H' | 'Q'; since?: IsoDate; size?: number }): Promise<WaterList>;
  /** Daily mean flows, in litres per second (see readDailyFlows). */
  riverDailyFlows(options: Cancellable & { entityCode: string; since?: IsoDate; until?: IsoDate; size?: number }): Promise<WaterList>;
  /** Onde stations, to place on a map. */
  dryRiverStations(options: Cancellable & { departmentCode?: string; bbox?: BoundingBox; size?: number }): Promise<WaterList>;
  dryRiverObservations(options: Cancellable & { departmentCode?: string; stationCode?: string; bbox?: BoundingBox; since?: IsoDate; until?: IsoDate; flowCode?: FlowCode; size?: number }): Promise<WaterList>;
  findCommunes(options: Cancellable & { name: string; size?: number }): Promise<Commune[]>;
}

export declare function createWaterClient(options?: { fetchImpl?: typeof fetch; baseAddress?: string }): WaterClient;

/* Readers: pure functions to read Hub'Eau items. */

export declare const FLOW_STATES: Readonly<Record<FlowCode, string>>;

export interface Reading {
  date: string;
  station: string | null;
  /** Metres for a height, m³/s for a flow. */
  value: number | null;
}

export interface DailyFlow extends Reading {
  status: string;
}

export interface DrinkingWaterSample {
  date: string;
  network: string | null;
  distributor: string | null;
  conclusion: string | null;
  measures: { parameter: string; result: string | number; unit: string | null; qualityLimit: string | null; qualityReference: string | null }[];
}

export declare function rounded(value: unknown, digits?: number): number | null;
export declare function metresFromMillimetres(millimetres: number): number | null;
export declare function cubicMetresFromLitres(litresPerSecond: number): number | null;
/** A site code returns its series and its stations': one item per date, the station's when there is one. */
export declare function onePerDate<Item extends { code_station?: string | null }>(items: Item[], dateField: keyof Item): Item[];
export declare function readRiverReadings(items: Record<string, unknown>[], quantity?: 'H' | 'Q'): Reading[];
export declare function readDailyFlows(items: Record<string, unknown>[]): DailyFlow[];
export declare function flowStateOf(item: { code_ecoulement?: string; libelle_ecoulement?: string }): string | null;
export declare function groupBySample(items: Record<string, unknown>[]): DrinkingWaterSample[];
