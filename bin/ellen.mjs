#!/usr/bin/env node
/**
 * Ellen: an MCP server (stdio) that gives an agent the public water data of France (Hub'Eau).
 * Usage in an MCP client: command « node », arguments « /chemin/vers/ellen/bin/ellen.mjs ».
 */
import { readFileSync } from 'node:fs';
import { createWaterClient } from '../src/client/index.mjs';
import { createServer } from '../src/server/protocol.mjs';
import { allTools, INSTRUCTIONS } from '../src/server/tools/index.mjs';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const server = createServer({ name: 'ellen', version, instructions: INSTRUCTIONS, tools: allTools(createWaterClient()) });
console.error(`Ellen ${version} : serveur MCP prêt (stdio).`);
await server.listen();
