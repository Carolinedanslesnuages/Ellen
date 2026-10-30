/** Rivers: gauging stations, real-time height and flow, daily mean flows. Hub'Eau mm and l/s become m and m³/s. */
import { SCHEMAS, required, optional, countOf, oneOf, daysAgo, rounded } from '../arguments.mjs';

const SOURCE = "Hub'Eau, hydrométrie (réseau Vigicrues et services de l'État)";
/**
 * A site code returns its own series and those of its stations: one reading per date is kept,
 * the station's when there is one.
 */
export function onePerDate(items, dateField) {
  const byDate = new Map();
  for (const item of items) {
    const kept = byDate.get(item[dateField]);
    if (!kept || (!kept.code_station && item.code_station)) byDate.set(item[dateField], item);
  }
  return [...byDate.values()];
}

const ENTITY_CODE = { type: 'string', pattern: '^[A-Z0-9]{8}(\\d{2})?$', description: 'Code du site (8 caractères) ou de la station (10 caractères), donné par rivieres_stations.' };

export function riverTools(client, { today = () => new Date() } = {}) {
  return [
    {
      name: 'rivieres_stations',
      title: 'Stations de mesure des rivières',
      description: "Les stations hydrométriques en service d'un département, d'une commune ou d'une rivière : où l'on mesure la hauteur et le débit des rivières.",
      inputSchema: {
        type: 'object',
        properties: {
          code_departement: SCHEMAS.departmentCode,
          code_commune: SCHEMAS.communeCode,
          nom: { type: 'string', minLength: 2, description: 'Nom de la rivière ou du lieu, cherché dans le nom des stations, majuscules ou non (ex. Vilaine, Rennes).' },
          nombre: SCHEMAS.count(20, 100),
        },
      },
      async run(args) {
        oneOf(args, ['code_departement', 'code_commune', 'nom']);
        const { total, items } = await client.riverStations({
          departmentCode: optional(args, 'code_departement', SCHEMAS.departmentCode),
          communeCode: optional(args, 'code_commune', SCHEMAS.communeCode),
          name: typeof args.nom === 'string' ? args.nom.trim() : undefined,
          size: countOf(args, 20, 100),
        });
        return {
          source: SOURCE,
          total,
          stations: items.map((item) => ({
            code_station: item.code_station,
            code_site: item.code_site,
            station: item.libelle_station,
            cours_eau: item.libelle_cours_eau,
            commune: item.libelle_commune,
            longitude: item.longitude_station,
            latitude: item.latitude_station,
          })),
        };
      },
    },
    {
      name: 'riviere_temps_reel',
      title: "Hauteur ou débit d'une rivière en temps réel",
      description: "Les dernières mesures d'une station ou d'un site : hauteur d'eau (en mètres) ou débit (en m³/s), les plus récentes d'abord. Un mois d'historique au plus. Si une station ne répond rien, essayez le code de son site.",
      inputSchema: {
        type: 'object',
        properties: {
          code: ENTITY_CODE,
          grandeur: { type: 'string', enum: ['hauteur', 'debit'], default: 'debit', description: 'hauteur (m) ou debit (m³/s).' },
          depuis: { ...SCHEMAS.date, description: 'Mesures à partir de cette date (AAAA-MM-JJ, un mois au plus).' },
          nombre: SCHEMAS.count(24, 500),
        },
        required: ['code'],
      },
      async run(args) {
        const isHeight = args.grandeur === 'hauteur';
        const { total, items } = await client.riverReadings({
          entityCode: required(args, 'code', ENTITY_CODE),
          quantity: isHeight ? 'H' : 'Q',
          since: optional(args, 'depuis', SCHEMAS.date),
          // Twice the size: a site answers with its series and its stations' (see onePerDate).
          size: countOf(args, 24, 500) * 2,
        });
        const unit = isHeight ? 'hauteur_m' : 'debit_m3_s';
        return {
          source: SOURCE,
          total,
          mesures: onePerDate(items, 'date_obs').slice(0, countOf(args, 24, 500)).map((item) => ({ date: item.date_obs, station: item.code_station, [unit]: rounded(item.resultat_obs / 1000) })),
        };
      },
    },
    {
      name: 'riviere_debits_journaliers',
      title: "Débits moyens journaliers d'une rivière",
      description: "Le débit moyen de chaque jour (en m³/s) d'une station ou d'un site, du plus ancien au plus récent. Par défaut, les 30 derniers jours ; l'historique remonte souvent à plusieurs décennies.",
      inputSchema: {
        type: 'object',
        properties: {
          code: ENTITY_CODE,
          depuis: { ...SCHEMAS.date, description: 'Premier jour (AAAA-MM-JJ, il y a 30 jours par défaut).' },
          jusqu_a: { ...SCHEMAS.date, description: 'Dernier jour (AAAA-MM-JJ).' },
          nombre: SCHEMAS.count(31, 366),
        },
        required: ['code'],
      },
      async run(args) {
        const { total, items } = await client.riverDailyFlows({
          entityCode: required(args, 'code', ENTITY_CODE),
          since: optional(args, 'depuis', SCHEMAS.date) ?? daysAgo(30, today()),
          until: optional(args, 'jusqu_a', SCHEMAS.date),
          size: countOf(args, 31, 366) * 2,
        });
        return {
          source: SOURCE,
          total,
          jours: onePerDate(items, 'date_obs_elab').slice(0, countOf(args, 31, 366)).map((item) => ({ date: item.date_obs_elab, station: item.code_station, debit_moyen_m3_s: rounded(item.resultat_obs_elab / 1000), statut: item.libelle_statut })),
        };
      },
    },
  ];
}
