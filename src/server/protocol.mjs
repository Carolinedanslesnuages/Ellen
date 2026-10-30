/**
 * The Model Context Protocol over stdio: one JSON-RPC 2.0 message per line on stdin, answers on
 * stdout, anything else (logs) on stderr. Only what a tool server needs: initialize, ping,
 * tools/list, tools/call.
 */
import { createInterface } from 'node:readline';

const SUPPORTED_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

export function createServer({ name, version, instructions, tools }) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  const handlers = {
    initialize: (params = {}) => ({
      // The client's version when we speak it, otherwise our latest: the client decides.
      protocolVersion: SUPPORTED_VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED_VERSIONS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name, version },
      instructions,
    }),
    ping: () => ({}),
    'tools/list': () => ({ tools: tools.map(({ name: toolName, title, description, inputSchema }) => ({ name: toolName, title, description, inputSchema })) }),
    'tools/call': async (params = {}) => {
      const tool = byName.get(params.name);
      if (!tool) throw Object.assign(new Error(`Outil inconnu : ${params.name}`), { code: INVALID_PARAMS });
      try {
        const result = await tool.run(params.arguments ?? {});
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 1) }], structuredContent: result };
      } catch (error) {
        // A tool failure is a result the agent can read and act on, not a protocol error.
        return { content: [{ type: 'text', text: error.message }], isError: true };
      }
    },
  };

  /** Answer to one message (an object), or null for a notification. */
  async function handle(message) {
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return { jsonrpc: '2.0', id: message?.id ?? null, error: { code: INVALID_REQUEST, message: 'Requête JSON-RPC invalide.' } };
    }
    const isNotification = message.id === undefined;
    const handler = handlers[message.method];
    if (isNotification) return null;
    if (!handler) return { jsonrpc: '2.0', id: message.id, error: { code: METHOD_NOT_FOUND, message: `Méthode inconnue : ${message.method}` } };
    try {
      return { jsonrpc: '2.0', id: message.id, result: await handler(message.params) };
    } catch (error) {
      return { jsonrpc: '2.0', id: message.id, error: { code: error.code ?? INVALID_PARAMS, message: error.message } };
    }
  }

  /** Reads messages line by line; answers in order of arrival. */
  function listen(input = process.stdin, output = process.stdout) {
    const lines = createInterface({ input, crlfDelay: Infinity });
    let queue = Promise.resolve();
    lines.on('line', (line) => {
      if (!line.trim()) return;
      queue = queue.then(async () => {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: PARSE_ERROR, message: 'JSON illisible.' } })}\n`);
          return;
        }
        const answer = await handle(message);
        if (answer) output.write(`${JSON.stringify(answer)}\n`);
      });
    });
    return new Promise((resolve) => lines.on('close', () => queue.then(resolve)));
  }

  return { handle, listen };
}
