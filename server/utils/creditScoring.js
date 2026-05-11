/**
 * Credit scoring algorithm for loan applications
 * Implements rule-based scoring for dissertation project
 */

const calculateCreditScore = (application) => {
    let score = 0;
    let reasons = [];

    const monthlyIncome = parseFloat(application.monthlyIncome) || 0;
    const loanAmount = parseFloat(application.amount) || 0;
    const duration = parseInt(application.duration) || 12;

    // ===== INCOME ASSESSMENT (max 40 points) =====
    if (monthlyIncome >= 200000) {
        score += 40;
        reasons.push('High income');
    } else if (monthlyIncome >= 100000) {
        score += 30;
        reasons.push('Good income');
    } else if (monthlyIncome >= 50000) {
        score += 20;
        reasons.push('Moderate income');
    } else if (monthlyIncome >= 25000) {
        score += 10;
        reasons.push('Low income');
    } else {
        score += 5;
        reasons.push('Very low income');
    }

    // ===== LOAN AMOUNT VS INCOME RATIO (max 30 points) =====
    const monthlyPayment = loanAmount / duration;
    const incomeRatio = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 100;

    if (incomeRatio <= 10) {
        score += 30;
        reasons.push('Excellent debt-to-income ratio');
    } else if (incomeRatio <= 20) {
        score += 25;
        reasons.push('Good debt-to-income ratio');
    } else if (incomeRatio <= 30) {
        score += 20;
        reasons.push('Moderate debt-to-income ratio');
    } else if (incomeRatio <= 40) {
        score += 10;
        reasons.push('High debt-to-income ratio');
    } else {
        score += 0;
        reasons.push('Very high debt-to-income ratio');
    }

    // ===== EMPLOYMENT STABILITY (max 20 points) =====
    const empStatus = (application.employmentStatus || '').toLowerCase();

    if (empStatus === 'employed') {
        score += 20;
        reasons.push('Stable employment');
    } else if (empStatus === 'self-employed' || empStatus === 'business') {
        score += 15;
        reasons.push('Self-employed/Business owner');
    } else if (empStatus === 'contract') {
        score += 10;
        reasons.push('Contract work');
    } else {
        score += 5;
        reasons.push('Unstable employment');
    }

    // ===== EXISTING LOANS (max 10 points) =====
    const existingLoans = parseInt(application.existingLoans) || 0;

    if (existingLoans === 0) {
        score += 10;
        reasons.push('No existing loans');
    } else if (existingLoans === 1) {
        score += 7;
        reasons.push('One existing loan');
    } else if (existingLoans === 2) {
        score += 4;
        reasons.push('Two existing loans');
    } else {
        score += 0;
        reasons.push('Multiple existing loans');
    }

    // ===== FINAL ASSESSMENT =====
    const approved = score >= 60;
    const riskLevel = score >= 80 ? 'low' : score >= 60 ? 'medium' : 'high';

    return {
        score,
        maxScore: 100,
        approved,
        riskLevel,
        reasons: reasons.join('. ')
    };
};

const calculateInterestRate = (score) => {
    if (score >= 80) return 8.5;
    if (score >= 70) return 10.5;
    if (score >= 60) return 13.0;
    if (score >= 50) return 16.0;
    if (score >= 40) return 19.0;
    return 22.0;
};

const makeLoanDecision = (application) => {
    const assessment = calculateCreditScore(application);

    // Risk score represents estimated default risk.
    // Example: credit score 75/100 gives risk score 0.25 = 25%.
    const riskScore = Number(((100 - assessment.score) / 100).toFixed(2));

    if (assessment.approved) {
        const interestRate = calculateInterestRate(assessment.score);
        const monthlyPayment =
            (parseFloat(application.amount) / parseInt(application.duration)) *
            (1 + (interestRate / 100) / 12 * parseInt(application.duration));

        return {
            approved: true,
            status: 'approved',
            interestRate: interestRate.toFixed(2),
            monthlyPayment: monthlyPayment.toFixed(2),
            decisionReason: `APPROVED: Credit Score ${assessment.score}/100, Risk Score ${(riskScore * 100).toFixed(0)}%, Risk Level ${assessment.riskLevel}. ${assessment.reasons}`,
            creditScore: assessment.score,
            riskScore,
            riskLevel: assessment.riskLevel
        };
    } else {
        return {
            approved: false,
            status: 'rejected',
            interestRate: '0',
            monthlyPayment: '0',
            decisionReason: `REJECTED: Credit Score ${assessment.score}/100, Risk Score ${(riskScore * 100).toFixed(0)}%, Risk Level ${assessment.riskLevel}. ${assessment.reasons}`,
            creditScore: assessment.score,
            riskScore,
            riskLevel: assessment.riskLevel
        };
    }
};

module.exports = {
    calculateCreditScore,
    calculateInterestRate,
    makeLoanDecision
};