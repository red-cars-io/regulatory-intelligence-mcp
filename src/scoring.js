// Compliance Risk Scoring Module
// Sub-models: enforcementExposure, sanctionsScreening, regulatoryFilings, exportControl

/**
 * Calculate enforcement exposure score (0-100)
 * Based on FDA enforcement count and active recalls
 */
export function calculateEnforcementExposureScore(fdaEnforcementCount, activeRecalls, importAlerts = 0) {
    let score = 0;
    const signals = [];

    // Enforcement actions: 10 pts each, cap 50
    const enforcementPoints = Math.min(fdaEnforcementCount * 10, 50);
    score += enforcementPoints;
    if (fdaEnforcementCount > 0) {
        signals.push(`${fdaEnforcementCount} FDA enforcement action(s) in past 5 years`);
    }

    // Active recalls: 8 pts each, cap 32
    const recallPoints = Math.min(activeRecalls * 8, 32);
    score += recallPoints;
    if (activeRecalls > 0) {
        signals.push(`${activeRecalls} active recall(s) on record`);
    }

    // Import alerts: 6 pts each, cap 18
    const importPoints = Math.min(importAlerts * 6, 18);
    score += importPoints;
    if (importAlerts > 0) {
        signals.push(`${importAlerts} import alert(s) active`);
    }

    return {
        score: Math.min(score, 100),
        signals
    };
}

/**
 * Calculate sanctions screening score from entity_compliance_check result
 */
export function calculateSanctionsScreeningScore(sanctionsResult) {
    // Score comes directly from entity_compliance_check result
    return {
        score: sanctionsResult.score || 0,
        signals: sanctionsResult.signals || []
    };
}

/**
 * Calculate regulatory filings score (0-100)
 * Based on recent filing count and SEC inquiry flags
 */
export function calculateRegulatoryFilingsScore(recentFilingCount, insiderTradingFlag = false, secInquiryFlag = false) {
    let score = 0;
    const signals = [];

    // Filing volume: 1 pt per filing, cap 40
    const volumePoints = Math.min(recentFilingCount, 40);
    score += volumePoints;

    // SEC inquiry flag: +30 pts
    if (secInquiryFlag) {
        score += 30;
        signals.push('SEC inquiry or investigation flagged');
    }

    // Insider trading flag: +15 pts
    if (insiderTradingFlag) {
        score += 15;
        signals.push('Unusual insider trading pattern detected');
    }

    // Normal filing activity signal
    if (!secInquiryFlag && !insiderTradingFlag && recentFilingCount > 0) {
        signals.push('Normal filing activity — no irregularities detected');
    }

    return {
        score: Math.min(score, 100),
        signals
    };
}

/**
 * Calculate export control score (0-100)
 * Based on controlled entity status and license requirements
 */
export function calculateExportControlScore(controlledEntity, licenseRequired, matchedEntities = []) {
    let score = 0;
    const signals = [];

    if (controlledEntity) {
        // Already on controlled list: high score
        score = 50;
        signals.push('Entity appears on export control list');

        // Check license requirement
        if (licenseRequired) {
            score = Math.min(score + 35, 100);
            signals.push('Export license required for this entity');
        }
    } else if (matchedEntities.length > 0) {
        // Partial match
        score = 20;
        signals.push(`${matchedEntities.length} export control match(es)`);
    } else {
        // Clear
        score = 0;
        signals.push('No export control restrictions detected');
    }

    return {
        score: Math.min(score, 100),
        signals
    };
}

/**
 * Calculate composite compliance risk score
 * Weights: enforcementExposure 30%, sanctionsScreening 30%, regulatoryFilings 20%, exportControl 20%
 */
export function calculateCompositeComplianceScore(enforcementExposure, sanctionsScreening, regulatoryFilings, exportControl) {
    const compositeScore = Math.round(
        (enforcementExposure * 0.30) +
        (sanctionsScreening * 0.30) +
        (regulatoryFilings * 0.20) +
        (exportControl * 0.20)
    );

    let riskLevel = 'LOW';
    if (compositeScore >= 76) riskLevel = 'CRITICAL';
    else if (compositeScore >= 51) riskLevel = 'HIGH';
    else if (compositeScore >= 26) riskLevel = 'MODERATE';

    return {
        compositeScore,
        riskLevel
    };
}

/**
 * Get risk level label from score
 */
export function getRiskLevel(score) {
    if (score >= 76) return 'CRITICAL';
    if (score >= 51) return 'HIGH';
    if (score >= 26) return 'MODERATE';
    return 'LOW';
}

/**
 * Calculate verdict from entity compliance check score
 */
export function getVerdictFromScore(score) {
    if (score >= 30) return 'FLAG';
    if (score >= 10) return 'ENHANCED_REVIEW';
    return 'CLEAR';
}

export default {
    calculateEnforcementExposureScore,
    calculateSanctionsScreeningScore,
    calculateRegulatoryFilingsScore,
    calculateExportControlScore,
    calculateCompositeComplianceScore,
    getRiskLevel,
    getVerdictFromScore
};