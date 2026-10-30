/** Groundwater: the monitoring wells of an area, and the water level of one of them. */
import { SCHEMAS, required, optional, countOf, oneOf, rounded } from '../arguments.mjs';

const SOURCE = "Hub'Eau, piézométrie (niveaux des nappes, ADES)";
const BSS_CODE = { type: 'string', minLength: 5, description: 'Code BSS du piézomètre (ex. 02465X0061/F), donné par nappes_stations.' };

export function groundwaterTools(client) {
  return [
    {
      name: 'nappes_stations',
      title: 'Piézomètres (stations de mesure des nappes)',
      description: "Les piézomètres d'un département ou d'une commune : où l'on mesure le niveau des nappes souterraines, quelle nappe, et la période de mesure. Seuls ceux qui ont des mesures sont donnés.",
      inputSchema: {
        type: 'object',
        properties: { code_departement: SCHEMAS.departmentCode, code_commune: SCHEMAS.communeCode, nombre: SCHEMAS.count(20, 100) },
      },
      async run(args) {
        oneOf(args, ['code_departement', 'code_commune']);
        const { total, items } = await client.groundwaterStations({
          departmentCode: optional(args, 'code_departement', SCHEMAS.departmentCode),
          communeCode: optional(args, 'code_commune', SCHEMAS.communeCode),
          size: countOf(args, 20, 100),
        });
        return {
          source: SOURCE,
          total,
          stations: items.map((item) => ({
            code_bss: item.code_bss,
            commune: item.nom_commune,
            code_commune: item.code_commune_insee,
            nappes: item.noms_masse_eau_edl ?? [],
            premiere_mesure: item.date_debut_mesure,
            derniere_mesure: item.date_fin_mesure,
            nombre_mesures: item.nb_mesures_piezo,
            longitude: item.x,
            latitude: item.y,
          })),
        };
      },
    },
    {
      name: 'nappe_niveaux',
      title: "Niveau d'une nappe",
      description: "Le niveau d'eau mesuré dans un piézomètre, les mesures les plus récentes d'abord : la profondeur de l'eau sous le sol (en mètres) et son altitude (en mètres NGF). Par défaut, les relevés récents ; « historique » donne les données validées, plus anciennes.",
      inputSchema: {
        type: 'object',
        properties: {
          code_bss: BSS_CODE,
          depuis: { ...SCHEMAS.date, description: 'Mesures à partir de cette date (AAAA-MM-JJ).' },
          jusqu_a: { ...SCHEMAS.date, description: "Mesures jusqu'à cette date (AAAA-MM-JJ)." },
          historique: { type: 'boolean', default: false, description: 'true : données validées (historique long) plutôt que relevés récents.' },
          nombre: SCHEMAS.count(30, 365),
        },
        required: ['code_bss'],
      },
      async run(args) {
        const { total, items } = await client.groundwaterLevels({
          bssCode: required(args, 'code_bss', BSS_CODE),
          since: optional(args, 'depuis', SCHEMAS.date),
          until: optional(args, 'jusqu_a', SCHEMAS.date),
          history: args.historique === true,
          size: countOf(args, 30, 365),
        });
        return {
          source: SOURCE,
          total,
          mesures: items.map((item) => ({ date: item.date_mesure, profondeur_m: rounded(item.profondeur_nappe, 2), niveau_ngf_m: rounded(item.niveau_eau_ngf ?? item.niveau_nappe_eau, 2) })),
          remarque: items.length ? undefined : 'Aucune mesure : essayez « historique: true », ou une autre période.',
        };
      },
    },
  ];
}
