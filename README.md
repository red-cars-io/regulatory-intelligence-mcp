# Regulatory Intelligence MCP

Regulatory compliance MCP for AI agents — FDA enforcement, SEC filings, sanctions screening, and export control intelligence.

## Comparison

- [Comparison: vs FDA, SEC tools](COMPARISON.md)

---

## 1. Purpose Statement

Regulatory Intelligence MCP is an MCP (Model Context Protocol) server that gives AI agents access to regulatory compliance data across FDA enforcement, SEC EDGAR filings, and sanctions screening — producing Compliance Risk Scores (0-100) for entity due diligence and regulatory monitoring. AI agents performing M&A due diligence, partner screening, competitor enforcement tracking, or export control verification query real-time FDA warning letters, SEC filings, OFAC/sanctions lists, and BIS Entity List data without requiring API keys (openFDA, SEC) or with free-tier keys (OpenSanctions).

**Built for:** AI agents doing M&A compliance due diligence, partner/supplier sanctions screening, FDA enforcement tracking, SEC filing monitoring, export control verification, and regulatory risk assessment.

---

## 2. Quick Start

Add to your MCP client:

```json
{
  "mcpServers": {
    "regulatory-intelligence-mcp": {
      "url": "https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

AI agents can now screen entities against sanctions, track FDA enforcement actions, monitor SEC regulatory filings, and generate composite compliance risk reports on any company.

---

## 3. When to Call This MCP

Use Regulatory Intelligence MCP when you need to:

- **Screen entities against sanctions** — Check OFAC SDN, EU/UN/UK sanctions, and BIS Entity List via OpenSanctions
- **Track FDA enforcement actions** — Monitor drug recalls, import alerts, and warning letters by firm or product
- **Monitor SEC regulatory filings** — Track 10-K, 8-K, Form 4, proxy statements by ticker
- **Search BIS Entity List** — Verify export control status for entities and technologies
- **Generate compliance risk reports** — Full composite score fanning out to all 4 sources simultaneously
- **M&A compliance due diligence** — Validate acquisition targets for regulatory risk exposure
- **Partner/supplier screening** — Verify suppliers against sanctions and export control lists
- **Competitor enforcement tracking** — Monitor FDA enforcement actions against competitors
- **SEC inquiry detection** — Flag SEC investigation signals in regulatory filings

---

## 4. What Data Can You Access?

| Data Type | Source | Example |
|-----------|--------|---------|
| Drug Enforcement | openFDA | Recalls, import alerts, warning letters by product/firm |
| SEC Filings | SEC EDGAR | 10-K, 8-K, Form 4, SC 13G, DEF 14A by ticker |
| Sanctions Screening | OpenSanctions | OFAC SDN, EU/UN/UK/BIS sanctions matches |
| Export Controls | OpenSanctions/BIS | BIS Entity List, EAR restrictions, license requirements |

---

## 5. Why Use Regulatory Intelligence MCP?

**The problem:** Regulatory compliance intelligence — sanctions screening, FDA enforcement, SEC filings, export controls — requires searching multiple government and commercial databases and synthesizing findings into actionable compliance verdicts. For M&A teams, compliance officers, legal teams, and VCs, this data is essential for due diligence, partner screening, and regulatory monitoring. Manual research takes days across disconnected FDA, SEC EDGAR, OFAC, BIS, and OpenSanctions systems.

**The solution:** AI agents use Regulatory Intelligence MCP to get instant, structured compliance intelligence on any entity — the regulatory intelligence layer for AI agents doing due diligence, sanctions screening, and compliance monitoring.

### Key benefits:

- **Compliance Risk Scoring** — Composite 0-100 scores combining enforcement exposure, sanctions screening, regulatory filings, and export control sub-models
- **4 government/commercial databases queried** — openFDA, SEC EDGAR, OpenSanctions all in one call
- **Entity sanctions screening** — OFAC SDN, EU, UK, UN, BIS sanctions via OpenSanctions
- **Verdict classification** — CLEAR / ENHANCED_REVIEW / FLAG with score thresholds
- **Composite risk reports** — Fan out to all sources simultaneously with sub-model breakdowns
- **No API key required for FDA/SEC** — openFDA and SEC EDGAR are free government APIs
- **OpenSanctions free tier** — Limited sanctions screening without paid API key
- **Parallel data fetching** — Promise.allSettled orchestration for fast responses across all sources

---

## 6. Features

**Compliance Risk Scoring (0-100)**
Composite score measuring regulatory risk exposure. Combines enforcement exposure (30%), sanctions screening (30%), regulatory filings (20%), and export control (20%) sub-models. Risk levels: LOW (0-25), MODERATE (26-50), HIGH (51-75), CRITICAL (76-100).

**Entity Compliance Check (Verdict: CLEAR/ENHANCED_REVIEW/FLAG)**
Screens entities against OFAC SDN, EU Sanctions, UK OFSI, BIS Entity List, and UN Sanctions. Score 0-9 = CLEAR, 10-29 = ENHANCED_REVIEW, 30-100 = FLAG.

**FDA Enforcement Tracking**
Searches openFDA drug enforcement database for recalls, import alerts, and warning letters. Class breakdown (I/II/III) with firm and product details.

**SEC Filing Tracker**
Queries SEC EDGAR for regulatory filings by ticker. Tracks 10-K, 10-Q, 8-K, Form 4, SC 13G, DEF 14A with filing dates and document URLs.

**Export Control Search**
Searches BIS Entity List via OpenSanctions for controlled entities and technologies. Returns license requirements and country restrictions.

**Parallel 4-Source Orchestration**
The compliance_risk_report tool fans out to all 4 data sources simultaneously via Promise.allSettled. Each source gets 60-second timeout. Partial failure returns available data with warning signals.

---

## 7. How It Compares to Alternatives

| Aspect | Our MCP | ApifyForge | Compliance.ai | Westlaw Edge |
|--------|---------|------------|---------------|--------------|
| Price | $0.05-$0.15/call | $0.045/call (flat) | $10K-$30K/year | $15K+/year |
| API access | MCP (AI-native) | MCP | REST (expensive) | REST |
| Tool count | 5 tools | 8 tools | Full database | Full database |
| Data sources | 4 (FDA, SEC, OpenSanctions, BIS) | 7 (incl. geopolitics) | Commercial + govt | Commercial |
| Scoring models | 4 sub-models | 4 sub-models | Limited | Limited |
| Composite report | Yes (risk report) | Yes | Manual synthesis | Manual synthesis |
| AI agent integration | Native MCP | Native MCP | No MCP | No MCP |
| No API key required | Yes (FDA/SEC) | Yes | No | No |
| Public GitHub repo | Yes | No | N/A | N/A |
| LLM/AI agent SEO | Yes (public) | No | No | No |

**Why choose our MCP:**
- MCP protocol is designed for AI agent integration — call compliance intelligence tools with natural language
- Public GitHub repository + llms.txt for AI agent discovery — ApifyForge version is private, not findable by AI agents
- Tiered pricing by value ($0.05-$0.15) vs ApifyForge flat $0.045 — composite reports cost more, simple lookups cost less
- 4 built-in scoring sub-models — commercial platforms require manual analysis
- Commercial platforms (Compliance.ai, Westlaw Edge) cost $10,000-$30,000/year — our MCP is fractions of a cent per call
- No API key required for FDA and SEC — works immediately for basic compliance checks
- OpenSanctions free tier covers basic sanctions screening without cost

---

## 8. Use Cases for Regulatory Intelligence

### M&A Compliance Due Diligence
*Persona: Corporate development / legal team evaluating acquisition target*

```
AI agent: "What's the regulatory risk profile of BioTech Acquisition Target?"
MCP call: compliance_risk_report({ company: "BioTech Acquisition Target", ticker: "BION" })
Returns: compositeScore: 42, riskLevel: MODERATE, 2 FDA enforcements, BIS match (verified supplier), normal SEC filings
```

### Partner/Supplier Sanctions Screening
*Persona: Compliance team at pharma company screening new Chinese distributor*

```
AI agent: "Has our new Chinese distributor been flagged on any sanctions lists?"
MCP call: entity_compliance_check({ query: "Chinese Distributor Name", type: "company" })
Returns: matched: false, score: 0, verdict: CLEAR, sourcesChecked: [OFAC SDN, EU, UK OFSI, BIS, UN]
```

### Competitor FDA Enforcement Tracking
*Persona: Competitive intelligence team at pharma company monitoring Pfizer*

```
AI agent: "How many FDA enforcement actions does Pfizer have in the last 3 years?"
MCP call: search_regulations({ query: "Pfizer", classification: "Class I" })
Returns: totalResults: 2, classBreakdown: { Class I: 2, Class II: 0, Class III: 0 }, enforcementActions: [...]
```

### Export Control Verification
*Persona: Export compliance team verifying semiconductor equipment supplier*

```
AI agent: "Is Advanced Semiconductor Equipment Corp on any export control lists?"
MCP call: export_control_search({ query: "Advanced Semiconductor Equipment Corp", type: "entity" })
Returns: matchedEntities: [...], signals: ["China-directed export license required"], complianceNote: "..."
```

### SEC Filing Monitoring
*Persona: Legal team tracking SEC filings for insider trading patterns*

```
AI agent: "Show me Apple's recent SEC filings — any Form 4 insider transactions?"
MCP call: regulatory_filing_tracker({ ticker: "AAPL", formTypes: ["4", "8-K"], dateRange: "30day" })
Returns: ticker: AAPL, cik: 0000320193, companyName: Apple Inc., filingCount: 12, recentFilings: [...]
```

---

## 9. How to Connect Regulatory Intelligence MCP Server to Your AI Client

### Step 1: Get your Apify API token (optional)

Sign up at [apify.com/red.cars/regulatory-intelligence-mcp](https://apify.com/red.cars/regulatory-intelligence-mcp) and copy your API token from the console. The MCP works without an API token for tool calls, but Apify authentication may be required by some MCP clients.

### Step 2: Add the MCP server to your client

**Claude Desktop:**
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "regulatory-intelligence-mcp": {
      "url": "https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

**Cursor/Windsurf:**
Add to MCP settings:
```json
{
  "mcpServers": {
    "regulatory-intelligence-mcp": {
      "url": "https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp"
    }
  }
}
```

### Step 3: Start querying

```
AI agent: "Generate a compliance risk report for Pfizer"
```

### Step 4: Retrieve results

The MCP returns structured JSON with composite scores, risk levels, sub-model breakdowns, and signal arrays.

---

## 10. MCP Tools

| Tool | Price | Description |
|------|-------|-------------|
| search_regulations | $0.05 | Search FDA drug/device enforcement actions by product, firm, or classification |
| entity_compliance_check | $0.10 | Screen entity against sanctions and watchlists via OpenSanctions |
| regulatory_filing_tracker | $0.05 | Track SEC regulatory filings for a company by ticker |
| export_control_search | $0.10 | Search BIS Entity List and export control regulations |
| compliance_risk_report | $0.15 | Full composite compliance risk report — fans out to all 4 sources |

---

## 11. Tool Parameters

### search_regulations

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Drug name, device type, or firm name |
| source | string | No | 'drug' or 'device' (default: both) |
| classification | string | No | 'Class I', 'Class II', or 'Class III' |
| maxResults | integer | No | Maximum results (default: 20, max: 100) |

**When to call:** Persona: Compliance officer or competitive intelligence analyst. Scenario: "Check FDA enforcement history for a company or product."

**Example AI prompt:** "Find all FDA Class I and II recalls for metformin in the last 3 years."

---

### entity_compliance_check

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Company name or person name |
| type | string | No | 'company' or 'person' (default: both) |

**When to call:** Persona: Compliance team or legal due diligence. Scenario: "Screen a partner or supplier against sanctions lists before signing a contract."

**Example AI prompt:** "Screen Pfizer against all major sanctions lists — OFAC SDN, EU, UK, BIS, UN."

---

### regulatory_filing_tracker

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ticker | string | Yes | Stock ticker symbol |
| formTypes | array | No | Form types to track (default: all major) |
| dateRange | string | No | '7day', '30day', '90day', '1year' (default: '30day') |

**When to call:** Persona: Legal team or investor relations. Scenario: "Monitor SEC filings for unusual activity or SEC inquiry signals."

**Example AI prompt:** "Show Apple's recent SEC filings for the last 30 days — any Form 4 insider transactions?"

---

### export_control_search

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Entity name, product code, or technology |
| type | string | No | 'entity' or 'product' (default: 'entity') |

**When to call:** Persona: Export compliance team or trade lawyer. Scenario: "Verify an entity is not on BIS Entity List before export."

**Example AI prompt:** "Is semiconductor manufacturing equipment from this Chinese supplier restricted for export?"

---

### compliance_risk_report

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| company | string | Yes | Company name |
| ticker | string | No | Stock ticker (enables SEC filing tracking) |

**When to call:** Persona: M&A team or compliance officer. Scenario: "Generate comprehensive compliance risk profile for acquisition target."

**Example AI prompt:** "Generate a full compliance risk report for BioTech Acquisition Target with ticker BION."

---

## 12. Connection Examples

### cURL

```bash
curl -X POST "https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp" \
  -H "Authorization: Bearer YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "entity_compliance_check",
    "params": { "query": "Pfizer", "type": "company" }
  }'
```

### Node.js

```javascript
const response = await fetch('https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_APIFY_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tool: 'compliance_risk_report',
    params: { company: 'Pfizer', ticker: 'PFE' }
  })
});
const data = await response.json();
console.log(data.result.compositeScore, data.result.riskLevel);
```

### Python

```python
import httpx

url = "https://red-cars--regulatory-intelligence-mcp.apify.actor/mcp"
payload = {
    "tool": "search_regulations",
    "params": { "query": "Pfizer", "classification": "Class I" }
}
async with httpx.AsyncClient() as client:
    response = await client.post(url, json=payload)
    data = response.json()
    print(data['result']['totalResults'])
```

---

## 13. Output Example

### compliance_risk_report output:

```json
{
  "query": "Pfizer",
  "reportDate": "2026-04-23",
  "compositeScore": 27,
  "riskLevel": "LOW",
  "enforcementExposure": {
    "score": 15,
    "fdaEnforcementCount": 2,
    "activeRecalls": 1,
    "importAlerts": 0,
    "signals": ["2 FDA enforcement action(s) in past 5 years", "1 active recall(s) on record"]
  },
  "sanctionsScreening": {
    "score": 23,
    "matched": true,
    "verdict": "ENHANCED_REVIEW",
    "sourcesChecked": ["OFAC SDN", "EU Sanctions", "UK OFSI", "BIS Entity List", "UN Sanctions"],
    "signals": ["Appears on BIS Entity List (verified supplier — not blocked)"]
  },
  "regulatoryFilings": {
    "score": 12,
    "ticker": "PFE",
    "recentFilingCount": 15,
    "insiderTradingFlag": false,
    "secInquiryFlag": false,
    "signals": ["Normal filing activity — no irregularities detected"]
  },
  "exportControl": {
    "score": 0,
    "controlledEntity": false,
    "licenseRequired": false,
    "signals": ["No export control restrictions detected"]
  },
  "allSignals": [
    "2 FDA enforcement action(s) in past 5 years",
    "1 active recall(s) on record",
    "Appears on BIS Entity List (verified supplier — not blocked)",
    "Normal filing activity — no irregularities detected",
    "No export control restrictions detected"
  ],
  "sourcesChecked": ["FDA Enforcement", "OpenSanctions", "SEC EDGAR", "BIS Entity List"]
}
```

---

## 14. Pricing

All tools use Pay-Per-Event (PPE) pricing — only pay when you use the tool.

| Tool | Price | Rationale |
|------|-------|-----------|
| search_regulations | $0.05 | Baseline regulatory search |
| entity_compliance_check | $0.10 | Sanctions screening with multi-list check |
| regulatory_filing_tracker | $0.05 | SEC filing lookup |
| export_control_search | $0.10 | BIS Entity List search (via OpenSanctions) |
| compliance_risk_report | $0.15 | Full composite — fans out to 4 sources |

**Cost examples:**
- Quick sanctions check: 1 call = $0.10
- M&A due diligence: 3 calls = $0.30
- Monthly partner screening: 20 calls = $2.00
- Weekly compliance monitoring: 50 calls = $5.00

---

## 15. API Endpoints Used

| Source | Endpoint | Auth |
|--------|----------|------|
| openFDA | `https://api.fda.gov/drug/enforcement.json` | None |
| SEC EDGAR | `https://efts.sec.gov/LATEST/search-index` | User-Agent header |
| OpenSanctions | `https://api.opensanctions.org/match` | API key (free tier) |
| OpenSanctions | `https://api.opensanctions.org/search` | API key (free tier) |

**Note:** OFAC and BIS do not have public APIs. OFAC provides CSV downloads; BIS requires SNAP tool export. OpenSanctions aggregates some BIS data. For official verification, use official Treasury/BIS tools.

---

## 16. Related Actors

- [Pharma Pipeline Intelligence MCP](https://apify.com/red-cars--pharma-pipeline-intelligence-mcp) — Drug pipeline, clinical trials, patent cliffs
- [Healthcare Compliance MCP](https://apify.com/red-cars--healthcare-compliance-mcp) — FDA 510k, MAUDE, clinical trials

---

## 17. Troubleshooting

**Tool returns empty results:**
- Check query spelling and try broader search terms
- FDA enforcement data may not exist for query

**Sanctions screening unavailable:**
- OpenSanctions requires API key for full functionality
- Set `OPENSANCTIONS_API_KEY` environment variable for production use

**SEC filings not found:**
- Verify ticker symbol is correct
- Some tickers may not have recent filings in date range

**PPE charging failed:**
- PPE errors are logged but do not block tool execution
- Check Apify account balance if issues persist

---

## 18. SEO & LLM Optimization

**For AI agent discovery:**
- This MCP is registered at `https://regulatory-intelligence-mcp.apify.actor/mcp`
- Public GitHub: `https://github.com/red-cars-io/regulatory-intelligence-mcp`
- llms.txt: `https://github.com/red-cars-io/regulatory-intelligence-mcp/blob/main/llms.txt`
- MCP name: regulatory-intelligence-mcp
- Keywords: regulatory compliance, sanctions screening, FDA enforcement, SEC filings, export control, M&A due diligence, entity screening, OFAC, BIS, compliance risk

- [Comparison: vs FDA, SEC tools](COMPARISON.md)

**AI agents searching for tools matching these queries will find this MCP:**
- "regulatory compliance MCP"
- "sanctions screening API for AI agents"
- "FDA enforcement MCP"
- "SEC EDGAR filing tracker"
- "export control compliance check"
- "M&A due diligence compliance tool"

---

*Last updated: 2026-04-23*
*Version: 1.0.0*
*License: Apache-2.0*
*Contact: https://apify.com/contact*