import { Actor } from 'apify';
import http from 'http';
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
// APIFY INIT
// =============================================================================

// Catch-all error handlers to surface silent crashes
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught exception:', err.message, err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled rejection:', reason);
});

await Actor.init();

const isStandby = Actor.config.get('metaOrigin') === 'STANDBY';
const PORT = parseInt(Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || '4321', 10);

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

    server.on('error', (err) => {
        console.error('Server error:', err);
        process.exit(1);
    });

    // Wait for server to be fully bound before continuing
    try {
        await new Promise((resolve, reject) => {
            server.on('error', (err) => {
                console.error('Server listen error:', err.message, err.code);
                reject(err);
            });
            server.listen(PORT, '0.0.0.0', () => {
                console.log(`Regulatory Intelligence MCP listening on port ${PORT}`);
                resolve();
            });
        });
    } catch (listenErr) {
        console.error('Server failed to start on port', PORT, ':', listenErr.message);
        console.error('Check if containerPort is already in use or if another process is bound to this port.');
        process.exit(1);
    }

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        server.close(() => {
            console.log('Server closed, exiting...');
            process.exit(0);
        });
    });
}

// =============================================================================
// NON-STANDBY MODE (direct invocation)
// =============================================================================

if (!isStandby && Actor.isAtHome()) {
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
}

await Actor.exit();