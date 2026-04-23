// OpenSanctions API client
// Base: https://api.opensanctions.org/
// POST /match for entity screening
// API key required (free tier available)

const API_BASE = 'https://api.opensanctions.org';
const TIMEOUT_MS = 60000;

// OpenSanctions API key - use environment variable or fallback
const API_KEY = process.env.OPENSANCTIONS_API_KEY || '';

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
    } catch (error) {
        clearTimeout(timeout);
        throw error;
    }
}

/**
 * Screen an entity against sanctions and watchlists
 * @param {string} query - Company or person name
 * @param {string} type - 'company', 'person', or 'both'
 * @returns {Promise<Object>} Sanctions screening results
 */
export async function screenEntity(query, type = 'both') {
    try {
        if (!API_KEY) {
            // Graceful degradation without API key
            return {
                query,
                matched: false,
                score: 0,
                verdict: 'CLEAR',
                sourcesChecked: ['OFAC SDN', 'EU Sanctions', 'UK OFSI', 'BIS Entity List', 'UN Sanctions'],
                matches: [],
                signals: ['OpenSanctions API key not configured — screening unavailable'],
                source: 'OpenSanctions',
                warning: 'API key required for full screening'
            };
        }

        const response = await fetchWithTimeout(`${API_BASE}/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${API_KEY}`
            },
            body: JSON.stringify({
                queries: {
                    q1: {
                        type: type === 'person' ? 'person' : 'entity',
                        schema: type === 'person' ? 'Person' : 'Organization',
                        name: query
                    }
                }
            })
        });

        if (!response.ok) {
            return {
                query,
                matched: false,
                score: 0,
                verdict: 'CLEAR',
                sourcesChecked: ['OFAC SDN', 'EU Sanctions', 'UK OFSI', 'BIS Entity List', 'UN Sanctions'],
                matches: [],
                signals: [`OpenSanctions API error: HTTP ${response.status}`],
                source: 'OpenSanctions',
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        const result = data.results?.q1 || {};

        const matches = (result.matches || []).map(m => ({
            list: m.dataset || 'Unknown',
            name: m.entity?.name || query,
            type: m.entity?.schema || 'entity',
            listingDate: m.entity?.dates?.[0] || null,
            reason: m.match_summary || 'Sanctions match',
            url: m.entity?.urls?.[0] || null
        }));

        // Calculate score based on match severity
        let score = 0;
        const signals = [];

        if (matches.length > 0) {
            // Base score for any match
            score = 15;

            // Add points per match type
            const lists = matches.map(m => m.list);
            if (lists.some(l => l.includes('OFAC') || l.includes('SDN'))) {
                score = Math.max(score, 85);
                signals.push('OFAC SDN List match — critical');
            } else if (lists.some(l => l.includes('BIS') || l.includes('Entity List'))) {
                score = Math.max(score, 40);
                signals.push('BIS Entity List match — export license required');
            } else if (lists.some(l => l.includes('EU') || l.includes('UN'))) {
                score = Math.max(score, 35);
                signals.push('EU/UN sanctions match');
            } else {
                signals.push(`${matches.length} watchlist match(es) found`);
            }
        } else {
            signals.push('No sanctions or watchlist matches');
        }

        // Verdict determination
        let verdict = 'CLEAR';
        if (score >= 30) verdict = 'FLAG';
        else if (score >= 10) verdict = 'ENHANCED_REVIEW';

        return {
            query,
            matched: matches.length > 0,
            score,
            verdict,
            sourcesChecked: ['OFAC SDN', 'EU Sanctions', 'UK OFSI', 'BIS Entity List', 'UN Sanctions'],
            matches,
            signals,
            source: 'OpenSanctions'
        };
    } catch (error) {
        return {
            query,
            matched: false,
            score: 0,
            verdict: 'CLEAR',
            sourcesChecked: ['OFAC SDN', 'EU Sanctions', 'UK OFSI', 'BIS Entity List', 'UN Sanctions'],
            matches: [],
            signals: [`OpenSanctions error: ${error.message}`],
            source: 'OpenSanctions',
            error: error.message
        };
    }
}

/**
 * Search BIS Entity List via OpenSanctions
 * @param {string} query - Entity name, product code, or technology
 * @param {string} searchType - 'entity' or 'product'
 * @returns {Promise<Object>} Export control search results
 */
export async function searchExportControls(query, searchType = 'entity') {
    try {
        if (!API_KEY) {
            // Graceful degradation
            return {
                query,
                type: searchType,
                matchedEntities: [],
                signals: ['OpenSanctions API key not configured — export control search unavailable'],
                complianceNote: 'OpenSanctions API key required for BIS Entity List search',
                source: 'BIS Entity List (via OpenSanctions)',
                warning: 'API key required for full search'
            };
        }

        // Use search endpoint for entity list
        const response = await fetchWithTimeout(`${API_BASE}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `ApiKey ${API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                limit: 20,
                datasets: ['us_denial_list', 'us_entity_list', 'eu_sanctions', 'uk_sanctions', 'un_sanctions']
            })
        });

        if (!response.ok) {
            return {
                query,
                type: searchType,
                matchedEntities: [],
                signals: [`OpenSanctions search error: HTTP ${response.status}`],
                complianceNote: 'OpenSanctions API error — fallback to manual BIS verification recommended',
                source: 'BIS Entity List (via OpenSanctions)',
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        const results = data.results || [];

        const matchedEntities = results.map(r => ({
            name: r.name || query,
            entityType: r.schema || 'entity',
            controlList: r.datasets?.[0] || 'BIS Entity List',
            countryRestriction: r.countries?.[0] || null,
            licenseRequirement: r.license_required ? 'Required for all exports' : 'Not restricted',
            listingDate: r.created_at || null,
            source: 'BIS Entity List via OpenSanctions'
        }));

        const signals = [];
        if (matchedEntities.length > 0) {
            signals.push(`${matchedEntities.length} controlled entity/entities found`);
            const hasLicenseReq = matchedEntities.some(e => e.licenseRequirement === 'Required for all exports');
            if (hasLicenseReq) {
                signals.push('Export license required — verify with BIS SNAP tool');
            }
        } else {
            signals.push('No export control matches found');
        }

        return {
            query,
            type: searchType,
            matchedEntities,
            signals,
            complianceNote: 'OpenSanctions aggregates BIS data. For official verification, use BIS SNAP tool at biss.doc.gov',
            source: 'BIS Entity List (via OpenSanctions)'
        };
    } catch (error) {
        return {
            query,
            type: searchType,
            matchedEntities: [],
            signals: [`Export control search error: ${error.message}`],
            complianceNote: 'BIS Entity List search unavailable — use official BIS SNAP tool',
            source: 'BIS Entity List (via OpenSanctions)',
            error: error.message
        };
    }
}

export default { screenEntity, searchExportControls };