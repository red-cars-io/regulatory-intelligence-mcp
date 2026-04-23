// SEC EDGAR API client
// Requires User-Agent header with contact email
// Search: https://efts.sec.gov/LATEST/search-index?q={keyword}&dateRange={range}
// Rate limit: 10 req/sec

const EDGAR_SEARCH_BASE = 'https://efts.sec.gov/LATEST/search-index';
const EDGAR_ENTITY_BASE = 'https://www.sec.gov/cgi-bin/browse-edgar';
const TIMEOUT_MS = 60000;

// User-Agent header required by SEC
const SEC_HEADERS = {
    'User-Agent': 'RegulatoryMCP/1.0 (contact@example.com)',
    'Accept': 'application/json'
};

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
 * Get company CIK by ticker symbol
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Company info with CIK
 */
export async function getCompanyByTicker(ticker) {
    try {
        // Use SEC entity search endpoint
        const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=10-K&dateb=&owner=include&count=1&company=${encodeURIComponent(ticker)}`;
        const response = await fetchWithTimeout(url, {
            headers: SEC_HEADERS
        });

        if (!response.ok) {
            return { cik: null, companyName: null, error: `HTTP ${response.status}` };
        }

        const text = await response.text();
        // Parse CIK from response
        const cikMatch = text.match(/CIK=(\d+)/);
        const nameMatch = text.match(/<td>([^<]+)<\/td>\s*<td>/);

        return {
            ticker,
            cik: cikMatch ? cikMatch[1] : null,
            companyName: nameMatch ? nameMatch[1] : ticker,
            source: 'SEC EDGAR'
        };
    } catch (error) {
        return { ticker, cik: null, companyName: null, error: error.message, source: 'SEC EDGAR' };
    }
}

/**
 * Search SEC EDGAR filings by keyword
 * @param {string} keyword - Search keyword
 * @param {string} dateRange - '7day', '30day', '90day', '1year', 'custom'
 * @param {number} maxResults - Maximum results
 * @returns {Promise<Object>} Filing search results
 */
export async function searchFilings(keyword, dateRange = '30day', maxResults = 20) {
    try {
        // Map date range to SEC format
        const rangeMap = {
            '7day': '1w',
            '30day': '1m',
            '90day': '3m',
            '1year': '1y'
        };
        const secRange = rangeMap[dateRange] || '1m';

        const url = `${EDGAR_SEARCH_BASE}?q=${encodeURIComponent(keyword)}&dateRange=${secRange}`;
        const response = await fetchWithTimeout(url, {
            headers: SEC_HEADERS
        });

        if (!response.ok) {
            return {
                query: keyword,
                totalFilings: 0,
                filings: [],
                source: 'SEC EDGAR',
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];
        const filings = hits.slice(0, maxResults).map(hit => {
            const fields = hit._source || {};
            return {
                formType: fields.form_type || fields.ttype || 'Unknown',
                filingDate: fields.file_date || fields.date || null,
                description: fields.display_names?.[0] || fields.company_name || keyword,
                documentUrl: fields.file_url || null,
                companyName: fields.company_name || keyword
            };
        });

        return {
            query: keyword,
            totalFilings: data.hits?.total || hits.length,
            filings,
            source: 'SEC EDGAR'
        };
    } catch (error) {
        return {
            query: keyword,
            totalFilings: 0,
            filings: [],
            source: 'SEC EDGAR',
            error: error.message
        };
    }
}

/**
 * Get regulatory filings for a specific company by ticker
 * @param {string} ticker - Stock ticker symbol
 * @param {string[]} formTypes - Array of form types to track
 * @param {string} dateRange - Date range filter
 * @returns {Promise<Object>} Filing tracker results
 */
export async function getCompanyFilings(ticker, formTypes = ['10-K', '10-Q', '8-K', '4', 'SC 13G', 'DEF 14A'], dateRange = '30day') {
    try {
        // Get company CIK first
        const companyInfo = await getCompanyByTicker(ticker);
        const cik = companyInfo.cik;

        if (!cik) {
            // Fall back to keyword search
            const searchResults = await searchFilings(ticker, dateRange, 50);
            const filtered = searchResults.filings.filter(f =>
                formTypes.length === 0 || formTypes.some(ft => f.formType.includes(ft))
            );

            return {
                query: ticker,
                ticker,
                cik: null,
                companyName: ticker,
                formsTracked: formTypes,
                recentFilings: filtered.slice(0, 20),
                filingCount: filtered.length,
                source: 'SEC EDGAR'
            };
        }

        // Build form type filter
        const formFilter = formTypes.length > 0 ? formTypes.join(',') : '10-K,10-Q,8-K,4,SC 13G,DEF 14A';

        // Use SEC search API for company filings
        const rangeMap = {
            '7day': '1w',
            '30day': '1m',
            '90day': '3m',
            '1year': '1y'
        };
        const secRange = rangeMap[dateRange] || '1m';

        // Search for company
        const url = `${EDGAR_SEARCH_BASE}?q=${encodeURIComponent(ticker)}&dateRange=${secRange}`;
        const response = await fetchWithTimeout(url, {
            headers: SEC_HEADERS
        });

        if (!response.ok) {
            return {
                query: ticker,
                ticker,
                cik,
                companyName: companyInfo.companyName,
                formsTracked: formTypes,
                recentFilings: [],
                filingCount: 0,
                source: 'SEC EDGAR',
                error: `HTTP ${response.status}`
            };
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        const recentFilings = hits
            .filter(hit => {
                const formType = hit._source?.form_type || hit._source?.ttype || '';
                return formTypes.length === 0 || formTypes.some(ft => formType.includes(ft));
            })
            .slice(0, 20)
            .map(hit => {
                const fields = hit._source || {};
                return {
                    formType: fields.form_type || fields.ttype || 'Unknown',
                    filingDate: fields.file_date || fields.date || null,
                    description: fields.display_names?.[0] || companyInfo.companyName,
                    documentUrl: fields.file_url || null
                };
            });

        return {
            query: ticker,
            ticker,
            cik,
            companyName: companyInfo.companyName,
            formsTracked: formTypes,
            recentFilings,
            filingCount: recentFilings.length,
            source: 'SEC EDGAR'
        };
    } catch (error) {
        return {
            query: ticker,
            ticker,
            cik: null,
            companyName: null,
            formsTracked: formTypes,
            recentFilings: [],
            filingCount: 0,
            source: 'SEC EDGAR',
            error: error.message
        };
    }
}

export default { getCompanyByTicker, searchFilings, getCompanyFilings };