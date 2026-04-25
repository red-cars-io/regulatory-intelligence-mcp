// SEC EDGAR API client
// Requires User-Agent header with contact email
// Search: https://efts.sec.gov/LATEST/search-index?q={keyword}&dateRange={range}
// Rate limit: 10 req/sec

const EDGAR_SEARCH_BASE = 'https://efts.sec.gov/LATEST/search-index';
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
 * Get company CIK by ticker symbol using SEC company search
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} Company info with CIK
 */
export async function getCompanyByTicker(ticker) {
    try {
        // Use SEC company search API
        const url = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(ticker)}&dateRange=1m`;
        const response = await fetchWithTimeout(url, { headers: SEC_HEADERS });

        if (!response.ok) {
            return { ticker, cik: null, companyName: null, error: `HTTP ${response.status}`, source: 'SEC EDGAR' };
        }

        const data = await response.json();
        const hits = data.hits?.hits || [];

        // Find a hit with matching CIK
        let cik = null;
        let companyName = ticker;

        for (const hit of hits) {
            const fields = hit._source || {};
            const displayNames = fields.display_names || [];
            const ciks = fields.ciks || [];

            // Look for exact ticker match in display_names
            const tickerPattern = new RegExp(`\\(${ticker}\\)\\s*\\(CIK\\s*(\\d+)\\)`, 'i');
            for (const name of displayNames) {
                const match = name.match(tickerPattern);
                if (match) {
                    cik = match[1];
                    companyName = name.replace(/\s*\([^)]*\)/, '').replace(/\s*\(CIK\s*\d+\)/, '').trim();
                    break;
                }
            }

            // Also check if CIK directly matches ticker
            for (const c of ciks) {
                // CIK 0000320193 for AAPL - look for AAPL pattern
                const cikStr = String(c).padStart(10, '0');
            }

            if (cik) break;
        }

        return {
            ticker,
            cik,
            companyName: companyName || ticker,
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
        const response = await fetchWithTimeout(url, { headers: SEC_HEADERS });

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
            const displayName = (fields.display_names && fields.display_names[0]) ? fields.display_names[0] : keyword;
            return {
                formType: fields.form || 'Unknown',
                filingDate: fields.file_date || null,
                description: displayName,
                documentUrl: `https://www.sec.gov/Archives/edgar/data/${(fields.ciks && fields.ciks[0]) || '0'}/${fields.adsh || ''}/${fields._id?.split(':')[1] || ''}`,
                companyName: displayName.replace(/\s*\([^)]*\)/, '').trim()
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

        // Map date range to SEC format
        const rangeMap = {
            '7day': '1w',
            '30day': '1m',
            '90day': '3m',
            '1year': '1y'
        };
        const secRange = rangeMap[dateRange] || '1m';

        // Search for company filings
        const url = `${EDGAR_SEARCH_BASE}?q=${encodeURIComponent(ticker)}&dateRange=${secRange}`;
        const response = await fetchWithTimeout(url, { headers: SEC_HEADERS });

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
                const formType = hit._source?.form || '';
                return formTypes.length === 0 || formTypes.some(ft => formType.includes(ft));
            })
            .slice(0, 20)
            .map(hit => {
                const fields = hit._source || {};
                const displayName = (fields.display_names && fields.display_names[0]) ? fields.display_names[0] : companyInfo.companyName || ticker;
                return {
                    formType: fields.form || 'Unknown',
                    filingDate: fields.file_date || null,
                    description: displayName,
                    documentUrl: fields.adsh ? `https://www.sec.gov/Archives/edgar/data/${cik || '0'}/${fields.adsh.replace(/-/g, '')}` : null
                };
            });

        return {
            query: ticker,
            ticker,
            cik,
            companyName: companyInfo.companyName || ticker,
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