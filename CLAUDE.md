# Regulatory Intelligence

**Type**: Apify MCP Actor (TypeScript)
**Purpose**: Regulatory compliance MCP for AI agents — FDA enforcement, SEC filings, sanctions screening for compliance and risk workflows
**Stack**: Apify SDK, CheerioCrawler (HTTP API), MCP protocol, standby mode

## Quick Start

```bash
cd ~/Projects/apify-actors/regulatory-intelligence-mcp
apify run          # Local development
apify push          # Deploy to Apify
```

## Key Files

- `src/main.ts` — MCP handler entry point with `handleRequest` export
- `.actor/actor.json` — Standby mode enabled (`usesStandbyMode: true`)
- `.actor/input_schema.json` — Tool definitions
- `README.md` — Auto-generated on build

## Architecture

- Standby MCP via `handleRequest` export
- Readiness probe at GET / (checks `x-apify-container-server-readiness-probe` header)
- Uses Apify SDK log package (`apify/log`)
- PPE configured — $0.03–0.15/tool
- Sources: FDA enforcement, SEC filings, OpenSanctions

## Tools

| Tool | Description | PPE |
|------|-------------|-----|
| `fda_enforcement` | FDA enforcement action lookup | $0.03 |
| `sec_filings` | SEC filing search and download | $0.05 |
| `sanctions_screen` | Screen against sanctions lists | $0.05 |
| `regulatory_report` | Combined regulatory risk report | $0.15 |

## Notes

- Health check cron: `~/bin/fleet-health.sh`
- Deployed at: `red-cars--regulatory-intelligence-mcp.apify.actor`
- Cross-sell with compliance-intelligence-mcp and company-intelligence-mcp
- Cross-sell with healthcare-compliance-mcp for FDA-specific compliance