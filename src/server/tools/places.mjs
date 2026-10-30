/** trouver_commune: the INSEE code every other tool expects, from a commune name (API Géo). */
import { countOf } from '../arguments.mjs';

export function placeTools(client) {
  return [
    {
      name: 'trouver_commune',
      title: 'Trouver une commune',
      description: "Cherche une commune française par son nom et donne son code INSEE (attendu par les autres outils), son département et ses codes postaux. Les plus peuplées d'abord.",
      inputSchema: {
        type: 'object',
        properties: {
          nom: { type: 'string', minLength: 2, description: 'Nom ou début du nom de la commune (ex. Rennes, Saint-Malo).' },
          nombre: { type: 'integer', minimum: 1, maximum: 10, default: 5, description: 'Nombre de communes (5 par défaut, 10 au plus).' },
        },
        required: ['nom'],
      },
      async run(args) {
        if (typeof args.nom !== 'string' || args.nom.trim().length < 2) throw new Error('Argument « nom » manquant : au moins 2 lettres du nom de la commune.');
        const communes = await client.findCommunes({ name: args.nom.trim(), size: countOf(args, 5, 10) });
        return {
          source: 'API Géo (geo.api.gouv.fr)',
          communes: communes.map((commune) => ({
            nom: commune.nom,
            code_insee: commune.code,
            departement: commune.codeDepartement,
            codes_postaux: commune.codesPostaux,
            population: commune.population ?? null,
          })),
        };
      },
    },
  ];
}
