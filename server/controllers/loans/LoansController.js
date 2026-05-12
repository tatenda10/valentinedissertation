const { getConnection } = require('../../config/database');
const fs = require('fs');
const { logAudit } = require('../../utils/auditLogger');
const { analyzeStatement, scoreLoanApplication } = require('../../services/mlLoanScoring');

const generateLoanReference = () => {
  const prefix = 'LOAN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const toNullableValue = (value) => (value === undefined || value === '' ? null : value);

const resolveMonthlyIncome = (monthlyIncome, statementAnalysis) => {
  const directIncome = Number(monthlyIncome);

  if (Number.isFinite(directIncome) && directIncome > 0) {
    return directIncome;
  }

  const inferredIncome = Number(statementAnalysis?.summary?.estimatedMonthlyIncome);
  return Number.isFinite(inferredIncome) && inferredIncome > 0 ? inferredIncome : 0;
};

const buildMlPayload = ({
  amount,
  duration,
  monthlyIncome,
  employmentStatus,
  existingLoans,
  statementAnalysis,
}) => ({
  amount: Number(amount),
  duration: Number(duration),
  monthlyIncome: resolveMonthlyIncome(monthlyIncome, statementAnalysis),
  employmentStatus,
  existingLoans: existingLoans ?? 0,
  statementSummary: statementAnalysis?.summary || null,
});

const roundCurrency = (value) => Number((Number(value) || 0).toFixed(2));

const calculateAffordabilityDetails = (loanLike = {}) => {
  const requestedAmount = Number(loanLike.amount || 0);
  const monthlyIncome = Number(loanLike.monthly_income || loanLike.monthlyIncome || loanLike.client_income || 0);
  const duration = Math.max(Number(loanLike.duration || 12), 1);
  const interestRate = Number(loanLike.interest_rate || loanLike.interestRate || 14);
  const maxMonthlyPayment = monthlyIncome > 0 ? monthlyIncome * 0.3 : 0;
  const maxAffordableLoan =
    maxMonthlyPayment > 0 ? (maxMonthlyPayment * duration) / (1 + interestRate / 100) : 0;

  const normalizedAffordableLoan = Math.min(Math.max(roundCurrency(maxAffordableLoan), 0), 10000);
  const recommendedAmount =
    normalizedAffordableLoan >= 100 ? normalizedAffordableLoan : 0;

  return {
    requestedAmount: roundCurrency(requestedAmount),
    monthlyIncome: roundCurrency(monthlyIncome),
    duration,
    interestRate: roundCurrency(interestRate),
    maxMonthlyPayment: roundCurrency(maxMonthlyPayment),
    maxAffordableLoan: normalizedAffordableLoan,
    recommendedAmount,
    shortfallAmount: roundCurrency(Math.max(requestedAmount - normalizedAffordableLoan, 0)),
  };
};

const buildRejectionAssessment = (loanLike = {}) => {
  const affordability = calculateAffordabilityDetails(loanLike);
  const existingLoans = parseInt(loanLike.existing_loans || loanLike.existingLoans || 0, 10);
  const employmentStatus = String(loanLike.employment_status || loanLike.employmentStatus || 'unknown').toLowerCase();
  const riskScore = Number(loanLike.risk_score || loanLike.riskScore || 0);
  const reasons = [];

  if (affordability.monthlyIncome < 300) {
    reasons.push(`Monthly income of $${affordability.monthlyIncome.toFixed(2)} is below the minimum requirement of $300.00.`);
  }

  if (
    affordability.maxAffordableLoan > 0 &&
    affordability.requestedAmount > affordability.maxAffordableLoan
  ) {
    reasons.push(
      `Requested amount of $${affordability.requestedAmount.toFixed(2)} is above the affordable limit of $${affordability.maxAffordableLoan.toFixed(2)} based on current income.`
    );
  }

  if (existingLoans >= 2) {
    reasons.push(`Applicant already has ${existingLoans} active loan(s), which is above the allowed limit.`);
  }

  if (employmentStatus === 'unemployed') {
    reasons.push('Stable employment or consistent business income is required before approval.');
  }

  if (employmentStatus === 'self-employed' && affordability.monthlyIncome > 0 && affordability.monthlyIncome < 500) {
    reasons.push(`Self-employed applicants require at least $500.00 monthly income, but current income is $${affordability.monthlyIncome.toFixed(2)}.`);
  }

  if (riskScore > 0 && riskScore < 0.5) {
    reasons.push(`Credit score signals are below the current approval threshold with a risk score of ${(riskScore * 100).toFixed(1)}%.`);
  }

  if (affordability.requestedAmount < 100) {
    reasons.push(`Requested amount of $${affordability.requestedAmount.toFixed(2)} is below the minimum loan size of $100.00.`);
  }

  if (affordability.requestedAmount > 10000) {
    reasons.push(`Requested amount of $${affordability.requestedAmount.toFixed(2)} exceeds the portfolio limit of $10,000.00.`);
  }

  let reasonText = reasons.join(' ');

  if (!reasonText) {
    reasonText = 'Loan application does not meet the current approval criteria based on the submitted financial profile.';
  }

  if (affordability.recommendedAmount > 0) {
    reasonText += ` Recommended eligible amount: $${affordability.recommendedAmount.toFixed(2)}.`;
  } else {
    reasonText += ' No eligible loan amount can be recommended at this time.';
  }

  return {
    reasons,
    reasonText,
    affordability,
  };
};

const buildStatementOverview = (statementAnalysis) => {
  const summary = statementAnalysis?.summary || {};

  return {
    statementCount: 1,
    transactionCount: Number(summary.transactionCount || 0),
    totalMoneyIn: roundCurrency(summary.totalDeposits),
    totalMoneyOut: roundCurrency(summary.totalWithdrawals),
    moneyInCount: Number(summary.depositCount || 0),
    moneyOutCount: Number(summary.withdrawalCount || 0),
    netCashFlow: roundCurrency(summary.netCashFlow),
    estimatedMonthlyIncome: roundCurrency(summary.estimatedMonthlyIncome),
    currentBalance: roundCurrency(summary.currentBalance),
    daysCovered: Number(summary.daysCovered || 0),
    activeDays: Number(summary.activeDays || 0),
  };
};

const enrichLoanRecord = async (loan, { includeStatementAnalysis = false } = {}) => {
  const rejectionAssessment = buildRejectionAssessment(loan);
  const enrichedLoan = {
    ...loan,
    affordability: rejectionAssessment.affordability,
    recommended_amount: rejectionAssessment.affordability.recommendedAmount,
    max_affordable_loan: rejectionAssessment.affordability.maxAffordableLoan,
  };

  if (includeStatementAnalysis && loan?.statement_path) {
    const resolvedPath = require('path').resolve(loan.statement_path);
    if (fs.existsSync(resolvedPath)) {
      const statementAnalysis = await analyzeStatement(resolvedPath);
      enrichedLoan.statement_analysis = statementAnalysis;
      enrichedLoan.statement_overview = buildStatementOverview(statementAnalysis);
    }
  }

  return enrichedLoan;
};

const persistLoan = async ({
  connection,
  clientId,
  amount,
  purpose,
  duration,
  monthlyIncome,
  employmentStatus,
  existingLoans,
  statementPath,
  mlResult,
}) => {
  const loanReference = generateLoanReference();
  const { decision } = mlResult;

  const insertParams = [
    loanReference,
    clientId,
    Number(amount),
    toNullableValue(purpose),
    Number(duration),
    Number(decision.interestRate || 0),
    Number(decision.monthlyPayment || 0),
    decision.status,
    decision.decisionReason,
    decision.riskScore,
    toNullableValue(monthlyIncome),
    toNullableValue(employmentStatus),
    existingLoans ?? 0,
  ];

  let insertQuery = `INSERT INTO loans (
        loan_reference, client_id, amount, purpose, duration,
        interest_rate, monthly_payment, status, decision_reason,
        risk_score, monthly_income, employment_status, existing_loans,
        application_date, decision_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

  if (statementPath) {
    insertQuery = `INSERT INTO loans (
        loan_reference, client_id, amount, purpose, duration,
        interest_rate, monthly_payment, status, decision_reason,
        risk_score, monthly_income, employment_status, existing_loans,
        statement_path, application_date, decision_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    insertParams.push(statementPath);
  }

  const [result] = await connection.execute(insertQuery, insertParams);
  return { result, loanReference };
};

// ================= SUBMIT LOAN (WITHOUT PDF) =================
const submitLoan = async (req, res) => {
  const connection = await getConnection();

  try {
    const {
      amount,
      purpose,
      duration,
      monthlyIncome,
      employmentStatus,
      existingLoans
    } = req.body;

    const clientId = req.user.userId;
    const mlResult = await scoreLoanApplication(
      buildMlPayload({
        amount,
        duration,
        monthlyIncome,
        employmentStatus,
        existingLoans,
      }),
    );

    const { result } = await persistLoan({
      connection,
      clientId,
      amount,
      purpose,
      duration,
      monthlyIncome: resolveMonthlyIncome(monthlyIncome),
      employmentStatus,
      existingLoans,
      mlResult,
    });

    const [loanDetails] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: `Loan application ${mlResult.decision.status}`,
      loan: loanDetails[0],
      scoring: mlResult,
      affordability: calculateAffordabilityDetails({
        ...loanDetails[0],
        monthly_income: resolveMonthlyIncome(monthlyIncome),
      }),
    });

  } catch (error) {
    console.error('Loan application error:', error);
    res.status(500).json({
      message: 'Server error while processing loan application',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= SUBMIT LOAN WITH PDF =================
const submitLoanWithPDF = async (req, res) => {
  const connection = await getConnection();

  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'Please upload your EcoCash statement PDF' 
      });
    }

    const {
      amount,
      purpose,
      duration,
      monthlyIncome,
      employmentStatus,
      existingLoans
    } = req.body;

    if (!amount || !purpose || !duration) {
      return res.status(400).json({ 
        message: 'Missing required fields' 
      });
    }

    const finalClientId = req.user?.userId;

    if (!finalClientId) {
      return res.status(400).json({ 
        message: 'Client ID not found' 
      });
    }

    const statementAnalysis = await analyzeStatement(req.file.path);
    const resolvedMonthlyIncome = resolveMonthlyIncome(monthlyIncome, statementAnalysis);
    const mlResult = await scoreLoanApplication(
      buildMlPayload({
        amount,
        duration,
        monthlyIncome: resolvedMonthlyIncome,
        employmentStatus,
        existingLoans: existingLoans || '0',
        statementAnalysis,
      }),
    );

    const { result } = await persistLoan({
      connection,
      clientId: finalClientId,
      amount,
      purpose,
      duration,
      monthlyIncome: resolvedMonthlyIncome,
      employmentStatus,
      existingLoans,
      statementPath: req.file.path,
      mlResult,
    });

    const [loanDetails] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: `Loan application ${mlResult.decision.status} with PDF statement`,
      loan: loanDetails[0],
      pdfFile: req.file.filename,
      statementAnalysis,
      statementOverview: buildStatementOverview(statementAnalysis),
      scoring: mlResult,
      affordability: calculateAffordabilityDetails({
        ...loanDetails[0],
        monthly_income: resolvedMonthlyIncome,
      }),
    });

  } catch (error) {
    console.error('Loan application with PDF error:', error);
    res.status(500).json({
      message: 'Server error while processing loan application',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= ANALYZE ECOCASH STATEMENT =================
const analyzeEcoCashStatement = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'Please upload your EcoCash statement PDF',
      });
    }

    const statementAnalysis = await analyzeStatement(req.file.path);

    res.json({
      message: 'EcoCash statement processed successfully',
      pdfFile: req.file.filename,
      statementAnalysis,
      statementOverview: buildStatementOverview(statementAnalysis),
    });
  } catch (error) {
    console.error('EcoCash statement analysis error:', error);
    res.status(500).json({
      message: 'Server error while processing EcoCash statement',
      error: error.message,
    });
  }
};

// ================= GET ALL LOANS =================
const getAllLoans = async (req, res) => {
  const connection = await getConnection();

  try {
    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.Gender, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       ORDER BY l.application_date DESC`
    );

    const enrichedLoans = loans.map((loan) => ({
      ...loan,
      affordability: calculateAffordabilityDetails(loan),
      recommended_amount: buildRejectionAssessment(loan).affordability.recommendedAmount,
      max_affordable_loan: buildRejectionAssessment(loan).affordability.maxAffordableLoan,
    }));

    res.json({ loans: enrichedLoans });

  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({
      message: 'Server error while fetching loans',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= APPROVED LOANS =================
const getApprovedLoans = async (req, res) => {
  const connection = await getConnection();

  try {
    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.status = 'approved'
       ORDER BY l.application_date DESC`
    );

    res.json({ loans });

  } catch (error) {
    console.error('Get approved loans error:', error);
    res.status(500).json({
      message: 'Server error while fetching approved loans',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= REJECTED LOANS =================
const getRejectedLoans = async (req, res) => {
  const connection = await getConnection();

  try {
    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.status = 'rejected'
       ORDER BY l.application_date DESC`
    );

    res.json({ loans });

  } catch (error) {
    console.error('Get rejected loans error:', error);
    res.status(500).json({
      message: 'Server error while fetching rejected loans',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= GET SINGLE LOAN (UPDATED - INCLUDES statement_path) =================
const getLoanById = async (req, res) => {
  const connection = await getConnection();

  try {
    const { id } = req.params;

    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number, c.Gender
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [id]
    );

    if (loans.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    // statement_path is automatically included in l.*
    const enrichedLoan = await enrichLoanRecord(loans[0], { includeStatementAnalysis: true });

    res.json({ loan: enrichedLoan });

  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      message: 'Server error while fetching loan details',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= CLIENT LOANS =================
const getClientLoans = async (req, res) => {
  const connection = await getConnection();

  try {
    const { clientId } = req.params;

    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.client_id = ?
       ORDER BY l.application_date DESC`,
      [clientId]
    );

    const summary = {
      totalLoans: loans.length,
      activeLoans: loans.filter(l => l.status === 'approved').length,
      rejectedLoans: loans.filter(l => l.status === 'rejected').length,
      totalAmount: loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0)
    };

    const enrichedLoans = loans.map((loan) => ({
      ...loan,
      affordability: calculateAffordabilityDetails(loan),
      recommended_amount: buildRejectionAssessment(loan).affordability.recommendedAmount,
      max_affordable_loan: buildRejectionAssessment(loan).affordability.maxAffordableLoan,
    }));

    res.json({ loans: enrichedLoans, summary });

  } catch (error) {
    console.error('Get client loans error:', error);
    res.status(500).json({
      message: 'Server error while fetching client loans',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// ================= GENERATE PERSONALIZED REJECTION REASON =================
const generateRejectionReason = async (loanId) => {
  const connection = await getConnection();
  
  try {
    const [loanData] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.monthly_income as client_income
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [loanId]
    );
    
    if (loanData.length === 0) {
      return "Loan data not found";
    }
    
    const loan = loanData[0];
    return buildRejectionAssessment(loan).reasonText;
    
  } catch (error) {
    console.error('Generate rejection reason error:', error);
    return "Loan does not meet approval criteria. Please review your application or contact support.";
  } finally {
    connection.release();
  }
};

// ================= UPDATE STATUS (WITH AUTO REJECTION REASON & AUDIT) =================
const updateLoanStatus = async (req, res) => {
  const connection = await getConnection();

  try {
    const { id } = req.params;
    const { status, interest_rate, monthly_payment } = req.body;

    const adminId = req.user?.userId;
    const adminUsername = req.user?.username || req.user?.email || 'Unknown Admin';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown IP';

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const [loan] = await connection.execute(
      'SELECT amount, loan_reference FROM loans WHERE id = ?',
      [id]
    );

    if (loan.length === 0) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const MIN_LOAN_AMOUNT = 100;
    const MAX_LOAN_AMOUNT = 10000;

    let decision_reason = null;

    if (status === 'approved') {
      const loanAmount = parseFloat(loan[0].amount);
      
      if (loanAmount < MIN_LOAN_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve. Minimum loan amount is $${MIN_LOAN_AMOUNT}. This loan is for $${loanAmount}.`
        });
      }
      
      if (loanAmount > MAX_LOAN_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve. Maximum loan amount is $${MAX_LOAN_AMOUNT}. This loan is for $${loanAmount}.`
        });
      }
    }

    if (status === 'rejected') {
      const rejectionAssessment = buildRejectionAssessment({
        ...(await connection.execute(
          `SELECT l.*, c.monthly_income as client_income
           FROM loans l
           JOIN clients c ON l.client_id = c.id
           WHERE l.id = ?`,
          [id]
        ))[0][0],
      });
      decision_reason = rejectionAssessment.reasonText;
      
      if (!decision_reason || decision_reason === 'Loan data not found') {
        decision_reason = "Loan does not meet approval criteria based on your financial profile.";
      }
    }

    await connection.execute(
      `UPDATE loans 
       SET status = ?, 
           decision_reason = ?, 
           decision_date = NOW()
       WHERE id = ?`,
      [status, decision_reason, id]
    );

    await logAudit(
      adminId,
      adminUsername,
      status === 'approved' ? 'LOAN_APPROVED' : 'LOAN_REJECTED',
      'loan',
      id,
      status === 'rejected' ? `Loan ${loan[0].loan_reference} rejected. Reason: ${decision_reason}` : `Loan ${loan[0].loan_reference} approved`,
      ipAddress
    );

    const [updatedLoan] = await connection.execute(
      `SELECT * FROM loans WHERE id = ?`,
      [id]
    );

    let message = `Loan ${status} successfully`;
    if (status === 'rejected') {
      message = `Loan rejected. Reason: ${decision_reason}`;
    }

    res.json({
      success: true,
      message: message,
      data: {
        ...updatedLoan[0],
        affordability: calculateAffordabilityDetails(updatedLoan[0]),
      }
    });

  } catch (error) {
    console.error('Update loan status error:', error);
    res.status(500).json({ message: 'Update failed', error: error.message });
  } finally {
    connection.release();
  }
};

// ================= EXPORT =================
module.exports = {
  submitLoan,
  submitLoanWithPDF,
  getAllLoans,
  getApprovedLoans,
  getRejectedLoans,
  getLoanById,
  getClientLoans,
  updateLoanStatus,
  generateRejectionReason,
  analyzeEcoCashStatement,
};
