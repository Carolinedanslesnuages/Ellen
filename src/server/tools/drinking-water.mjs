/** Drinking water: the networks serving a commune, and the latest test results, grouped by sample. */
import { SCHEMAS, required, optional, countOf } from '../arguments.mjs';

const SOURCE = "Hub'Eau, qualité de l'eau potable (contrôle sanitaire des ARS)";

/** Results of the same sample together: one date, one verdict, several measures. */
export function groupBySample(items) {
  const samples = new Map();
  for (const item of items) {
    if (!samples.has(item.code_prelevement)) {
      samples.set(item.code_prelevement, {
        date: item.date_prelevement,
        reseau: item.nom_uge ?? null,
        distributeur: item.nom_distributeur ?? null,
        conclusion: item.conclusion_conformite_prelevement ?? null,
        mesures: [],
      });
    }
    samples.get(item.code_prelevement).mesures.push({
      parametre: item.libelle_parametre,
      resultat: item.resultat_alphanumerique ?? item.resultat_numerique,
      unite: item.libelle_unite === 'SANS OBJET' ? null : item.libelle_unite ?? null,
      limite_qualite: item.limite_qualite_parametre ?? null,
      reference_qualite: item.reference_qualite_parametre ?? null,
    });
  }
  return [...samples.values()];
}

export function drinkingWaterTools(client) {
  return [
    {
      name: 'eau_potable_reseaux',
      title: "Réseaux d'eau potable d'une commune",
      description: "Les réseaux de distribution (unités de distribution) qui alimentent une commune en eau potable, par année. Une grande ville en a souvent plusieurs, par quartier.",
      inputSchema: {
        type: 'object',
        properties: { code_commune: SCHEMAS.communeCode, annee: { type: 'integer', description: 'Année (la plus récente par défaut).' }, nombre: SCHEMAS.count(20, 100) },
        required: ['code_commune'],
      },
      async run(args) {
        const { total, items } = await client.drinkingWaterNetworks({ communeCode: required(args, 'code_commune', SCHEMAS.communeCode), year: args.annee, size: countOf(args, 20, 100) });
        // Without a year, only the latest one: the list repeats each network for every year.
        const latestYear = items.reduce((latest, item) => (item.annee > latest ? item.annee : latest), '');
        const shown = args.annee ? items : items.filter((item) => item.annee === latestYear);
        return {
          source: SOURCE,
          total,
          reseaux: shown.map((item) => ({ reseau: item.nom_reseau, code_reseau: item.code_reseau, quartier: item.nom_quartier === '-' ? null : item.nom_quartier, annee: item.annee })),
        };
      },
    },
    {
      name: 'eau_potable_analyses',
      title: "Analyses de l'eau du robinet",
      description: "Les derniers résultats du contrôle sanitaire de l'eau du robinet d'une commune, regroupés par prélèvement, avec la conclusion de conformité, les limites et les références de qualité. Les plus récents d'abord.",
      inputSchema: {
        type: 'object',
        properties: {
          code_commune: SCHEMAS.communeCode,
          depuis: { ...SCHEMAS.date, description: 'Prélèvements à partir de cette date (AAAA-MM-JJ).' },
          parametre: { type: 'string', description: 'Libellé exact du paramètre, pour ne garder que lui (ex. « Nitrates (en NO3) », « Escherichia coli /100ml - MF », « Chlore libre »).' },
          nombre: SCHEMAS.count(30, 200),
        },
        required: ['code_commune'],
      },
      async run(args) {
        const { total, items } = await client.drinkingWaterResults({
          communeCode: required(args, 'code_commune', SCHEMAS.communeCode),
          since: optional(args, 'depuis', SCHEMAS.date),
          parameterLabel: args.parametre,
          size: countOf(args, 30, 200),
        });
        return { source: SOURCE, total_mesures: total, mesures_lues: items.length, prelevements: groupBySample(items) };
      },
    },
  ];
}
