import { Actor } from 'apify';
import http from 'http';
import { TOOLS, PPE_PRICES, handleTool } from './tools.js';

// =============================================================================
// CONSTANTS
// =============================================================================

const PORT = Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || 4321;

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
// HTTP SERVER (Standby Mode)
// =============================================================================

await Actor.init();

const isStandby = Actor.config.get('metaOrigin') === 'STANDBY';

if (isStandby) {
    const server = http.createServer(async (req, res) => {
        // Handle readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        // Handle MCP requests
        if (req.method === 'POST' && req.url === '/mcp') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const jsonBody = JSON.parse(body);
                    const id = jsonBody.id ?? null;

                    const reply = (result) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, result }
                            : result;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const replyError = (code, message) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, error: { code, message } }
                            : { status: 'error', error: message };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const method = jsonBody.method;

                    // Standard MCP: initialize
                    if (method === 'initialize') {
                        return reply({
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'regulatory-intelligence-mcp', version: '1.0.0' }
                        });
                    }

                    // Standard MCP: tools/list
                    if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
                        return reply({ tools: TOOLS });
                    }

                    // Standard MCP: tools/call
                    if (method === 'tools/call') {
                        const toolName = jsonBody.params?.name;
                        const toolArgs = jsonBody.params?.arguments || {};
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

                        const toolResult = await handleTool(toolName, jsonBody.params || {});
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    // Legacy direct: {tool: "...", params: {...}}
                    if (jsonBody.tool) {
                        const toolName = jsonBody.tool;

                        // PPE charging
                        const price = PPE_PRICES[toolName];
                        if (price && Actor) {
                            try {
                                await Actor.charge(price, { eventName: toolName });
                            } catch (chargeError) {
                                console.warn('PPE charging failed:', chargeError.message);
                            }
                        }

                        const toolResult = await handleTool(toolName, jsonBody.params || {});
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', result: toolResult }));
                        return;
                    }

                    return replyError(-32601, 'Method not found');
                } catch (err) {
                    return replyError(-32603, err.message);
                }
            });
            return;
        }

        // Not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(PORT, () => {
        console.log(`Regulatory Intelligence MCP listening on port ${PORT}`);
    });

    server.on('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
    });
}

// =============================================================================
// NON-STANDBY MODE (direct invocation)
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
// EXPORT handleRequest FOR MCP GATEWAY COMPATIBILITY
// =============================================================================

export default {
    handleRequest: async ({ request, response, log }) => {
        log.info("Regulatory Intelligence MCP received request");

        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const id = body.id ?? null;
            const method = body.method;

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
                log.info(`MCP tools/call: ${toolName}`);

                // PPE charging
                const price = PPE_PRICES[toolName];
                if (price && Actor) {
                    try {
                        await Actor.charge(price, { eventName: toolName });
                    } catch (chargeError) {
                        console.warn('PPE charging failed:', chargeError.message);
                    }
                }

                const toolResult = await handleTool(toolName, toolArgs);
                return reply({
                    content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                });
            }

            // Legacy format: { tool, params }
            const { tool, params = {} } = body;
            if (!tool) return replyError(-32602, 'Missing tool name');

            log.info(`Calling tool: ${tool}`);

            // PPE charging
            const price = PPE_PRICES[tool];
            if (price && Actor) {
                try {
                    await Actor.charge(price, { eventName: tool });
                } catch (chargeError) {
                    console.warn('PPE charging failed:', chargeError.message);
                }
            }

            const result = await handleTool(tool, params);
            reply({ status: "success", result });
        } catch (error) {
            log.error(`Error: ${error.message}`);
            response.send({ status: "error", error: error.message });
        }
    }
};