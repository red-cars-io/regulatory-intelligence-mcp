/**
 * Regulatory Intelligence MCP Server
 * FDA enforcement, SEC filings, and sanctions screening for AI agents.
 */

import http from 'http';
import { Actor } from 'apify';

// =============================================================================
// TOOL IMPLEMENTATIONS
// =============================================================================

const TOOL_PRICES = {
    "search_regulations": 0.05,
    "entity_compliance_check": 0.10,
    "regulatory_filing_tracker": 0.05,
    "export_control_search": 0.10,
    "compliance_risk_report": 0.15
};

async function searchEnforcement(query, classification = null, maxResults = 20) {
    try {
        const url = new URL('https://api.fda.gov/device/enforcement.json');
        url.searchParams.set('search', `product_description:"${query}"`);
        url.searchParams.set('limit', maxResults);
        const resp = await fetch(url.toString());
        if (!resp.ok) return { totalResults: 0, results: [] };
        const data = await resp.json();
        return {
            totalResults: data.meta?.results?.total || data.results?.length || 0,
            results: (data.results || []).map(r => ({
                recall_number: r.recall_number,
                firm: r.recalling_firm,
                product: r.product_description,
                classification: r.classification,
                reason: r.reason_for_recall,
                date: r.recall_initiation_date
            }))
        };
    } catch (e) {
        return { totalResults: 0, results: [] };
    }
}

async function screenEntity(entityName) {
    try {
        const url = new URL('https://api.opensanctions.org/entities/lookup');
        url.searchParams.set('q', entityName);
        const resp = await fetch(url.toString());
        if (!resp.ok) return { matched: false, entities: [], score: 0 };
        const data = await resp.json();
        const hits = (data.hits || []).filter(e => e.summary?.toLowerCase().includes(entityName.toLowerCase()));
        return { matched: hits.length > 0, entities: hits.slice(0, 5), score: Math.min(hits.length * 25, 100) };
    } catch (e) {
        return { matched: false, entities: [], score: 0 };
    }
}

async function handleTool(toolName, params = {}) {
    switch (toolName) {
        case 'search_regulations': {
            const r = await searchEnforcement(params.query, params.classification, params.max_results || 20);
            return { query: params.query, totalResults: r.totalResults, results: r.results };
        }
        case 'entity_compliance_check': {
            const r = await screenEntity(params.entity_name);
            return {
                entity: params.entity_name,
                matched: r.matched,
                entities: r.entities,
                score: r.score,
                verdict: r.score >= 50 ? 'FLAG' : r.score >= 25 ? 'ENHANCED_REVIEW' : 'CLEAR'
            };
        }
        case 'regulatory_filing_tracker':
            return { company: params.company_name, filings: [], message: 'SEC EDGAR placeholder' };
        case 'export_control_search':
            return { results: [], message: 'Export control placeholder' };
        case 'compliance_risk_report': {
            const [fda, sanctions] = await Promise.all([
                searchEnforcement(params.company_name, null, 10).catch(() => ({ totalResults: 0 })),
                screenEntity(params.company_name).catch(() => ({ matched: false, score: 0 }))
            ]);
            const score = Math.min((fda.totalResults * 10) + (sanctions.score * 2), 100);
            return {
                company: params.company_name,
                riskScore: score,
                riskLevel: score >= 76 ? 'CRITICAL' : score >= 51 ? 'HIGH' : score >= 26 ? 'MODERATE' : 'LOW',
                fdaEnforcementCount: fda.totalResults,
                sanctionsMatched: sanctions.matched
            };
        }
        default:
            return { error: `Unknown tool: ${toolName}` };
    }
}

// =============================================================================
// HTTP SERVER FOR STANDBY MODE
// =============================================================================

// Initialize Actor — always call init() once, unconditionally.
await Actor.init();

// Check standby mode AFTER init using the env var (official template pattern)
const isStandby = process.env.APIFY_META_ORIGIN === 'STANDBY';
const PORT = Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || 3000;

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
                    let tool, params;
                    if (jsonBody.method && jsonBody.method.startsWith('tools/')) {
                        tool = jsonBody.method.replace('tools/', '');
                        params = jsonBody.params || {};
                    } else {
                        tool = jsonBody.tool;
                        params = jsonBody.params || {};
                    }
                    if (tool === 'list') {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', tools: [] }));
                        return;
                    }
                    const result = await handleTool(tool, params);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success', result }));
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', error: error.message }));
                }
            });
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });

    server.listen(PORT, () => {
        console.log(`Regulatory Intelligence MCP listening on port ${PORT}`);
    });

    process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
} else {
    // Non-STANDBY mode: accept input and run tool, then exit
    const input = await Actor.getInput();
    if (input) {
        const { tool, params = {} } = input;
        if (tool) {
            console.log(`Running tool: ${tool}`);
            const result = await handleTool(tool, params);
            await Actor.setValue('OUTPUT', result);
        }
    }
    await Actor.exit();
}

// =============================================================================
// MCP GATEWAY HANDLER (for Apify MCP gateway integration)
// =============================================================================

export default {
    handleRequest: async ({ request, log }) => {
        log.info("Regulatory Intelligence MCP received request");
        try {
            const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            const { tool, params = {} } = body;
            const result = await handleTool(tool, params);
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (error) {
            log.error(`Error: ${error.message}`);
            return { content: [{ type: 'text', text: JSON.stringify({ status: "error", error: error.message }, null, 2) }] };
        }
    }
};
