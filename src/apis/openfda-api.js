// openFDA API client for drug enforcement data
// Base: https://api.fda.gov/drug/enforcement.json

const API_BASE = 'https://api.fda.gov/drug/enforcement.json';
const TIMEOUT_MS = 60000;

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
 * Search FDA drug enforcement actions by product, firm, or classification
 * @param {string} query - Drug name, device type, or firm name
 * @param {string} classification - Optional: 'Class I', 'Class II', 'Class III'
 * @param {number} maxResults - Maximum results (default: 50, max: 100)
 * @returns {Promise<Object>} Enforcement search results
 */
export async function searchEnforcement(query, classification = null, maxResults = 50) {
    try {
        let searchTerm = query;
        if (classification) {
            searchTerm = `${query}+AND+product_description:${classification}`;
        }

        const url = `${API_BASE}?search=${encodeURIComponent(searchTerm)}&limit=${maxResults}`;
        const response = await fetchWithTimeout(url);

        if (!response.ok) {
            return {
                totalResults: 0,
                classBreakdown: { 'Class I': 0, 'Class II': 0, 'Class III': 0 },
                enforcementActions: [],
                source: 'FDA Enforcement',
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        const results = data.results || [];

        // Classify breakdown
        const classBreakdown = { 'Class I': 0, 'Class II': 0, 'Class III': 0 };
        results.forEach(r => {
            const cls = r.classification || 'Unknown';
            if (cls.includes('I')) classBreakdown['Class I']++;
            else if (cls.includes('II')) classBreakdown['Class II']++;
            else if (cls.includes('III')) classBreakdown['Class III']++;
        });

        const enforcementActions = results.map(r => ({
            recallId: r.recall_number || 'Unknown',
            productDescription: r.product_description || 'Unknown',
            reasonForRecall: r.reason_for_recall || 'Unknown',
            classification: r.classification || 'Unknown',
            recallingFirm: r.recalling_firm || 'Unknown',
            distributionScope: r.distribution_pattern || 'Unknown',
            recallInitiationDate: r.recall_initiation_date || 'Unknown',
            status: r.status || 'Unknown'
        }));

        return {
            query,
            totalResults: results.length,
            classBreakdown,
            enforcementActions,
            source: 'FDA Enforcement'
        };
    } catch (error) {
        return {
            query,
            totalResults: 0,
            classBreakdown: { 'Class I': 0, 'Class II': 0, 'Class III': 0 },
            enforcementActions: [],
            source: 'FDA Enforcement',
            error: error.message
        };
    }
}

export default { searchEnforcement };