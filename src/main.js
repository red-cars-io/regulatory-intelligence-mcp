import { Actor } from 'apify';
import { TOOLS, PPE_PRICES, handleTool } from './tools.js';

// =============================================================================
// MCP MANIFEST
// =============================================================================

const MCP_MANIFEST = {
    name: 'regulatory-intelligence-mcp',
    version: '1.0',
    description: 'Regulatory compliance MCP for AI agents — FDA enforcement, SEC filings, sanctions screening',
    tools: TOOLS
};

// =============================================================================
// INITIALIZATION
// =============================================================================

await Actor.init();

// =============================================================================
// NON-STANDBY MODE (direct invocation / batch)
// =============================================================================

const input = await Actor.getInput();
if (input) {
    const { tool, params = {} } = input;
    if (tool) {
        // PPE charging for direct invocation
        const price = PPE_PRICES[tool];
        if (price && Actor) {
            try {
                await Actor.charge(price, { eventName: tool });
            } catch (chargeError) {
                console.warn('PPE charging failed:', chargeError.message);
            }
        }

        const result = await handleTool(tool, params);
        await Actor.setValue('OUTPUT', result);
    }
}

await Actor.exit();

// =============================================================================
// HANDLE REQUEST EXPORT (MCP Gateway - replaces HTTP server)
// =============================================================================

export default {
    handleRequest: async ({ request, response, log }) => {
        log.info("Regulatory Intelligence MCP received request");

        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const id = body.id ?? null;
            const method = body.method;

            // Helper to send JSON-RPC response
            const reply = (result) => {
                const resp = id !== null
                    ? { jsonrpc: '2.0', id, result }
                    : result;
                response.send(resp);
            };

            const replyError = (code, message) => {
                const resp = id !== null
                    ? { jsonrpc: '2.0', id, error: { code, message } }
                    : { status: 'error', error: message };
                response.send(resp);
            };

            // Standard MCP JSON-RPC methods
            if (method === 'initialize') {
                log.info('MCP initialize');
                return reply({
                    protocolVersion: '2024-11-05',
                    capabilities: { tools: {} },
                    serverInfo: { name: 'regulatory-intelligence-mcp', version: '1.0.0' }
                });
            }

            if (method === 'tools/list' || (!method && body.tool === 'list')) {
                log.info('MCP tools/list');
                return reply({ tools: MCP_MANIFEST.tools });
            }

            if (method === 'tools/call') {
                const toolName = body.params?.name;
                const toolArgs = body.params?.arguments || {};
                if (!toolName) return replyError(-32602, 'Missing params.name');

                // PPE charging
                const price = PPE_PRICES[toolName];
                if (price && Actor) {
                    try {
                        await Actor.charge(price, { eventName: toolName });
                    } catch (chargeError) {
                        console.warn('PPE charging failed:', chargeError.message);
                    }
                }

                log.info(`MCP tools/call: ${toolName}`);
                const toolResult = await handleTool(toolName, toolArgs);
                return reply({
                    content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                });
            }

            // Legacy: tools/{toolName} method format
            if (method && method.startsWith('tools/')) {
                const toolName = method.slice(6);

                // PPE charging
                const price = PPE_PRICES[toolName];
                if (price && Actor) {
                    try {
                        await Actor.charge(price, { eventName: toolName });
                    } catch (chargeError) {
                        console.warn('PPE charging failed:', chargeError.message);
                    }
                }

                const toolResult = await handleTool(toolName, body.params || {});
                return reply({
                    content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                });
            }

            // Legacy format: { tool, params }
            const { tool, params = {} } = body;
            if (!tool) return replyError(-32602, 'Missing tool name');

            // PPE charging
            const price = PPE_PRICES[tool];
            if (price && Actor) {
                try {
                    await Actor.charge(price, { eventName: tool });
                } catch (chargeError) {
                    console.warn('PPE charging failed:', chargeError.message);
                }
            }

            log.info(`Calling tool: ${tool}`);
            const result = await handleTool(tool, params);

            reply({ status: "success", result });
        } catch (error) {
            log.error(`Error: ${error.message}`);
            response.send({ status: "error", error: error.message });
        }
    }
};