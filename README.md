# Ellen

Les données publiques de l'eau en France, pour un agent : un serveur MCP sur
[Hub'Eau](https://hubeau.eaufrance.fr).

Un agent (Claude, ou tout client MCP) demande « l'eau du robinet est-elle bonne à Rennes ? »,
« où en sont les nappes en Ille-et-Vilaine ? » ou « quelles rivières sont à sec ? » : Ellen
interroge Hub'Eau, le service public des données sur l'eau, et répond avec des données
récentes, sourcées, dans des unités lisibles.

Le nom rend hommage à Ellen Swallow Richards (1842-1911), chimiste américaine, première femme
admise au MIT, qui a analysé pour le Massachusetts quelque 40 000 échantillons des eaux servant
à l'eau potable. Elle en a tiré une carte du chlore qui permettait de repérer la pollution des
eaux de l'État.

## Les outils

| Outil | Ce qu'il donne | Source Hub'Eau |
| --- | --- | --- |
| `trouver_commune` | Le code INSEE d'une commune, à partir de son nom (attendu par les autres outils) | API Géo |
| `eau_potable_reseaux` | Les réseaux de distribution qui alimentent une commune | Qualité de l'eau potable |
| `eau_potable_analyses` | Les dernières analyses de l'eau du robinet, par prélèvement, avec la conclusion de conformité | Qualité de l'eau potable |
| `nappes_stations` | Les piézomètres d'un département ou d'une commune, et leur nappe | Piézométrie |
| `nappe_niveaux` | Le niveau d'une nappe : profondeur sous le sol (m) et altitude (m NGF) | Piézométrie |
| `rivieres_stations` | Les stations de mesure des rivières, par département, commune ou nom | Hydrométrie |
| `riviere_temps_reel` | La hauteur (m) ou le débit (m³/s) d'une rivière, sur le dernier mois | Hydrométrie |
| `riviere_debits_journaliers` | Le débit moyen de chaque jour (m³/s), sur des décennies | Hydrométrie |
| `assecs_observations` | L'écoulement des petits cours d'eau : visible, faible, non visible, assec | Écoulement (Onde) |

Chaque réponse cite sa source et donne le total disponible. Hub'Eau mesure les hauteurs en
millimètres et les débits en litres par seconde : Ellen les convertit en mètres et en m³/s.
Une erreur d'argument (un nom de commune à la place d'un code INSEE, par exemple) revient à
l'agent comme un message qui dit quoi corriger.

## Installation

Node 20 ou plus, aucune dépendance :

```sh
git clone https://github.com/Carolinedanslesnuages/ellen.git
```

Puis déclarez le serveur dans votre client MCP. Avec Claude Code :

```sh
claude mcp add ellen -- node /chemin/vers/ellen/bin/ellen.mjs
```

Ou dans la configuration JSON d'un autre client :

```json
{
  "mcpServers": {
    "ellen": { "command": "node", "args": ["/chemin/vers/ellen/bin/ellen.mjs"] }
  }
}
```

Ellen parle MCP sur l'entrée et la sortie standard (stdio) ; ses messages de suivi vont sur la
sortie d'erreur.

## Le client de données, seul

Le client qu'utilise le serveur s'utilise aussi sans lui, dans Node ou dans un navigateur (Hub'Eau
et l'API Géo acceptent les appels depuis une page web). Il garde les champs d'origine de Hub'Eau
et a ses types TypeScript : une application cartographique comme Anita peut s'en servir telle
quelle.

```js
import { createWaterClient } from '@carolinedanslesnuages/ellen/client';

const water = createWaterClient();
const { total, items } = await water.dryRiverObservations({ departmentCode: '35', flowCode: '3' });
```

| Fonction | Service |
| --- | --- |
| `drinkingWaterNetworks`, `drinkingWaterResults` | Qualité de l'eau potable |
| `groundwaterStations`, `groundwaterLevels` | Piézométrie |
| `riverStations`, `riverReadings`, `riverDailyFlows` | Hydrométrie |
| `dryRiverObservations` | Écoulement des cours d'eau (Onde) |
| `findCommunes` | API Géo |

Chaque fonction Hub'Eau renvoie `{ total, items }`. Les dates s'écrivent `AAAA-MM-JJ`. Une
erreur de service lève une `WaterDataError` (message en français, `status`, `address`).

## Limites

- Hub'Eau renvoie au plus une page par appel : Ellen limite le nombre de résultats (`nombre`)
  pour ne pas noyer l'agent.
- Les mesures en temps réel des rivières ne remontent pas à plus d'un mois ; au-delà, les débits
  journaliers prennent le relais.
- Les observations d'assecs se font surtout de mai à septembre.
- Ellen ne garde rien : chaque question interroge Hub'Eau.

## Les données

Données publiques de [Hub'Eau](https://hubeau.eaufrance.fr), service né de la collaboration de
l'Office français de la biodiversité et du BRGM, et de l'[API Géo](https://geo.api.gouv.fr).
Chaque réponse d'Ellen nomme le jeu de données d'où elle vient.

## Licence

MIT
