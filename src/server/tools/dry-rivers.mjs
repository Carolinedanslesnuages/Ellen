/** Dry rivers: what the Onde observers saw in small streams (flowing, weak, not visible, dry). */
import { flowStateOf } from '../../client/index.mjs';
import { SCHEMAS, optional, countOf, oneOf } from '../arguments.mjs';

const SOURCE = "Hub'Eau, écoulement des cours d'eau (observatoire Onde de l'OFB)";
const FLOW_CODES = { acceptable: '1a', faible: '1f', non_visible: '2', assec: '3' };

/** How many observations of each state, for a quick reading of the situation. */
export function tally(observations) {
  const counts = {};
  for (const observation of observations) counts[observation.ecoulement] = (counts[observation.ecoulement] ?? 0) + 1;
  return counts;
}

export function dryRiverTools(client) {
  return [
    {
      name: 'assecs_observations',
      title: "Assecs et écoulement des petits cours d'eau",
      description: "Les observations de l'écoulement des petits cours d'eau (réseau Onde, de mai à septembre surtout) : écoulement visible acceptable, faible, non visible, ou assec (lit à sec). Les plus récentes d'abord, avec le décompte par état.",
      inputSchema: {
        type: 'object',
        properties: {
          code_departement: SCHEMAS.departmentCode,
          code_station: { type: 'string', pattern: '^[A-Z0-9]{8}$', description: "Code d'une station Onde (8 caractères)." },
          depuis: { ...SCHEMAS.date, description: 'Observations à partir de cette date (AAAA-MM-JJ).' },
          jusqu_a: { ...SCHEMAS.date, description: "Observations jusqu'à cette date (AAAA-MM-JJ)." },
          etat: { type: 'string', enum: Object.keys(FLOW_CODES), description: 'Ne garder que cet état (ex. assec).' },
          nombre: SCHEMAS.count(50, 500),
        },
      },
      async run(args) {
        oneOf(args, ['code_departement', 'code_station']);
        if (args.etat !== undefined && !FLOW_CODES[args.etat]) throw new Error(`Argument « etat » invalide : ${Object.keys(FLOW_CODES).join(', ')}.`);
        const { total, items } = await client.dryRiverObservations({
          departmentCode: optional(args, 'code_departement', SCHEMAS.departmentCode),
          stationCode: args.code_station,
          since: optional(args, 'depuis', SCHEMAS.date),
          until: optional(args, 'jusqu_a', SCHEMAS.date),
          flowCode: FLOW_CODES[args.etat],
          size: countOf(args, 50, 500),
        });
        const observations = items.map((item) => ({
          date: item.date_observation,
          station: item.libelle_station,
          code_station: item.code_station,
          cours_eau: item.libelle_cours_eau,
          commune: item.libelle_commune,
          ecoulement: flowStateOf(item),
        }));
        return { source: SOURCE, total, decompte: tally(observations), observations };
      },
    },
  ];
}
