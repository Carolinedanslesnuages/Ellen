/** Every tool of Ellen, built on one water data client. */
import { placeTools } from './places.mjs';
import { drinkingWaterTools } from './drinking-water.mjs';
import { groundwaterTools } from './groundwater.mjs';
import { riverTools } from './rivers.mjs';
import { dryRiverTools } from './dry-rivers.mjs';

export function allTools(client, options = {}) {
  return [...placeTools(client), ...drinkingWaterTools(client), ...groundwaterTools(client), ...riverTools(client, options), ...dryRiverTools(client)];
}

export const INSTRUCTIONS = [
  "Ellen donne les données publiques de l'eau en France (Hub'Eau) : eau du robinet, nappes souterraines, rivières, assecs.",
  'Les outils attendent des codes : code INSEE de commune (trouver_commune), numéro de département, code de station.',
  'Commencez par trouver_commune ou un outil *_stations, puis interrogez les mesures. Citez la source donnée dans chaque réponse.',
].join(' ');
