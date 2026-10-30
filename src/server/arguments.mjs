/**
 * Checks of tool arguments, with messages an agent can act on. JSON Schema pieces shared by tools.
 */
export const SCHEMAS = {
  communeCode: { type: 'string', pattern: '^(\\d{5}|2[AB]\\d{3})$', description: 'Code INSEE de la commune, 5 caractères (ex. 35238 pour Rennes). Voir trouver_commune.' },
  departmentCode: { type: 'string', pattern: '^(\\d{2,3}|2[AB])$', description: 'Numéro du département (ex. 35, 2A, 974).' },
  date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date au format AAAA-MM-JJ.' },
  count: (fallback, maximum) => ({ type: 'integer', minimum: 1, maximum, default: fallback, description: `Nombre de résultats (${fallback} par défaut, ${maximum} au plus).` }),
};

export class ArgumentError extends Error {}

/** The value of an optional argument, checked against its schema pattern. */
export function optional(args, name, schema) {
  const value = args[name];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || (schema.pattern && !new RegExp(schema.pattern).test(value))) {
    throw new ArgumentError(`Argument « ${name} » invalide (${JSON.stringify(value)}) : ${schema.description}`);
  }
  return value;
}

export function required(args, name, schema) {
  const value = optional(args, name, schema);
  if (value === undefined) throw new ArgumentError(`Argument « ${name} » manquant : ${schema.description}`);
  return value;
}

export function countOf(args, fallback, maximum) {
  const value = args.nombre ?? fallback;
  if (!Number.isInteger(value) || value < 1) throw new ArgumentError(`Argument « nombre » invalide : un entier entre 1 et ${maximum}.`);
  return Math.min(value, maximum);
}

/** One of the given arguments at least. */
export function oneOf(args, names) {
  if (!names.some((name) => args[name] !== undefined && args[name] !== '')) {
    throw new ArgumentError(`Donnez au moins un de ces arguments : ${names.join(', ')}.`);
  }
}

/** « AAAA-MM-JJ », a number of days ago. */
export function daysAgo(days, today = new Date()) {
  return new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Rounded number, or null when the source has none. */
export const rounded = (value, digits = 3) => (typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(digits)) : null);
