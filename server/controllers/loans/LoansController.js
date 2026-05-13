const { getConnection } = require('../../config/database');
const fs = require('fs');
const path = require('path');
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

const addMonths = (dateValue, months) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};

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

const fetchLoanRepayments = async (connection, loanId) => {
  try {
    const [repayments] = await connection.execute(
      `SELECT
          lr.*,
          u.username AS recorded_by_name
       FROM loan_repayments lr
       LEFT JOIN users u ON u.id = lr.recorded_by_user_id
       WHERE lr.loan_id = ?
       ORDER BY lr.payment_date DESC, lr.id DESC`,
      [loanId],
    );

    return repayments;
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return [];
    }

    throw error;
  }
};

const fetchRepaymentTotalsMap = async (connection, loanIds = []) => {
  if (!loanIds.length) {
    return new Map();
  }

  const placeholders = loanIds.map(() => '?').join(', ');

  try {
    const [rows] = await connection.execute(
      `SELECT
          loan_id,
          COUNT(*) AS repaymentCount,
          SUM(amount_paid) AS totalPaid,
          MAX(payment_date) AS lastPaymentDate
       FROM loan_repayments
       WHERE loan_id IN (${placeholders})
       GROUP BY loan_id`,
      loanIds,
    );

    return new Map(rows.map((row) => [Number(row.loan_id), row]));
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return new Map();
    }

    throw error;
  }
};

const resolveRecordedByUserId = async (connection, actorId) => {
  if (!actorId) {
    return null;
  }

  const [users] = await connection.execute(
    'SELECT id FROM users WHERE id = ? LIMIT 1',
    [actorId],
  );

  return users.length ? actorId : null;
};

const buildRepaymentSummary = (loan, repayments = [], aggregate = null) => {
  const principalAmount = roundCurrency(loan?.amount);
  const monthlyInstallment = roundCurrency(loan?.monthly_payment);
  const durationMonths = Math.max(Number(loan?.duration || 0), 0);
  const scheduledRepaymentTotal =
    monthlyInstallment > 0 && durationMonths > 0
      ? roundCurrency(monthlyInstallment * durationMonths)
      : principalAmount;
  const totalPaid = roundCurrency(
    aggregate?.totalPaid ??
      repayments.reduce((sum, repayment) => sum + Number(repayment.amount_paid || 0), 0),
  );
  const remainingBalance = roundCurrency(Math.max(scheduledRepaymentTotal - totalPaid, 0));
  const rawInstallmentsPaid =
    monthlyInstallment > 0 ? totalPaid / monthlyInstallment : 0;
  const installmentsPaid = Math.min(
    durationMonths || Number.MAX_SAFE_INTEGER,
    Math.floor(rawInstallmentsPaid + 0.00001),
  );
  const progressPercent =
    scheduledRepaymentTotal > 0
      ? Math.min(roundCurrency((totalPaid / scheduledRepaymentTotal) * 100), 100)
      : 0;
  const lastPayment = repayments[0] || null;
  const repaymentCount = Number(aggregate?.repaymentCount ?? repayments.length);
  const nextDueDate =
    loan?.status === 'approved' && durationMonths > 0
      ? addMonths(loan.decision_date || loan.application_date, installmentsPaid + 1)
      : null;

  return {
    totalPaid,
    remainingBalance,
    scheduledRepaymentTotal,
    monthlyInstallment,
    totalInstallments: durationMonths,
    installmentsPaid,
    progressPercent,
    lastPaymentDate: aggregate?.lastPaymentDate || lastPayment?.payment_date || null,
    lastPaymentAmount: roundCurrency(lastPayment?.amount_paid || 0),
    nextDueDate: nextDueDate ? nextDueDate.toISOString() : null,
    repaymentCount,
  };
};

const buildPaymentSchedule = (loan, summary = null) => {
  const repaymentSummary = summary || buildRepaymentSummary(loan, []);
  const totalInstallments = Math.max(Number(repaymentSummary.totalInstallments || loan?.duration || 0), 0);
  const monthlyInstallment = roundCurrency(repaymentSummary.monthlyInstallment || loan?.monthly_payment || 0);
  const scheduleBaseDate = loan?.decision_date || loan?.application_date;
  const rows = [];

  for (let index = 0; index < totalInstallments; index += 1) {
    const installmentNumber = index + 1;
    const dueDate = addMonths(scheduleBaseDate, installmentNumber);
    rows.push({
      installmentNumber,
      dueDate: dueDate ? dueDate.toISOString() : null,
      amount: monthlyInstallment,
      status:
        installmentNumber <= Number(repaymentSummary.installmentsPaid || 0)
          ? 'paid'
          : String(loan?.status || '').toLowerCase() === 'approved'
            ? 'upcoming'
            : 'pending',
    });
  }

  return rows;
};

const enrichLoanRecord = async (connection, loan, { includeStatementAnalysis = false } = {}) => {
  const rejectionAssessment = buildRejectionAssessment(loan);
  const repayments = await fetchLoanRepayments(connection, loan.id).catch(() => []);
  const repaymentSummary = buildRepaymentSummary(loan, repayments);
  const enrichedLoan = {
    ...loan,
    affordability: rejectionAssessment.affordability,
    recommended_amount: rejectionAssessment.affordability.recommendedAmount,
    max_affordable_loan: rejectionAssessment.affordability.maxAffordableLoan,
    repayment_history: repayments,
    repayment_summary: repaymentSummary,
    payment_schedule: buildPaymentSchedule(loan, repaymentSummary),
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

    const repaymentTotalsMap = await fetchRepaymentTotalsMap(
      connection,
      loans.map((loan) => loan.id),
    );

    const enrichedLoans = loans.map((loan) => {
      const repaymentSummary = buildRepaymentSummary(loan, [], repaymentTotalsMap.get(loan.id) || null);
      return {
        ...loan,
        affordability: calculateAffordabilityDetails(loan),
        recommended_amount: buildRejectionAssessment(loan).affordability.recommendedAmount,
        max_affordable_loan: buildRejectionAssessment(loan).affordability.maxAffordableLoan,
        repayment_summary: repaymentSummary,
        payment_schedule: buildPaymentSchedule(loan, repaymentSummary),
        repayment_count: Number(repaymentTotalsMap.get(loan.id)?.repaymentCount || 0),
      };
    });

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

    const isAdminUser = (req.user?.roles || []).some((role) => String(role).toLowerCase() === 'admin');
    if (!isAdminUser && Number(loans[0].client_id) !== Number(req.user?.userId)) {
      return res.status(403).json({ message: 'You can only access your own loan details' });
    }

    // statement_path is automatically included in l.*
    const enrichedLoan = await enrichLoanRecord(connection, loans[0], { includeStatementAnalysis: true });

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
    const isAdminUser = (req.user?.roles || []).some((role) => String(role).toLowerCase() === 'admin');

    if (!isAdminUser && Number(clientId) !== Number(req.user?.userId)) {
      return res.status(403).json({ message: 'You can only access your own loans' });
    }

    const [loans] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.client_id = ?
       ORDER BY l.application_date DESC`,
      [clientId]
    );

    const repaymentTotalsMap = await fetchRepaymentTotalsMap(
      connection,
      loans.map((loan) => loan.id),
    );

    const summary = {
      totalLoans: loans.length,
      activeLoans: loans.filter(l => l.status === 'approved').length,
      rejectedLoans: loans.filter(l => l.status === 'rejected').length,
      totalAmount: loans.reduce((sum, l) => sum + parseFloat(l.amount || 0), 0)
    };

    const enrichedLoans = loans.map((loan) => {
      const repaymentSummary = buildRepaymentSummary(loan, [], repaymentTotalsMap.get(loan.id) || null);
      return {
        ...loan,
        affordability: calculateAffordabilityDetails(loan),
        recommended_amount: buildRejectionAssessment(loan).affordability.recommendedAmount,
        max_affordable_loan: buildRejectionAssessment(loan).affordability.maxAffordableLoan,
        repayment_summary: repaymentSummary,
        payment_schedule: buildPaymentSchedule(loan, repaymentSummary),
        repayment_count: Number(repaymentTotalsMap.get(loan.id)?.repaymentCount || 0),
      };
    });

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

const getLoanRepayments = async (req, res) => {
  const connection = await getConnection();

  try {
    const { id } = req.params;
    const [loanRows] = await connection.execute(
      'SELECT id, client_id, amount, duration, monthly_payment, status, application_date, decision_date FROM loans WHERE id = ?',
      [id],
    );

    if (!loanRows.length) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanRows[0];
    const isAdminUser = (req.user?.roles || []).some((role) => String(role).toLowerCase() === 'admin');
    if (!isAdminUser && Number(loan.client_id) !== Number(req.user?.userId)) {
      return res.status(403).json({ message: 'You can only access your own loan repayments' });
    }

    const repayments = await fetchLoanRepayments(connection, id);
    res.json({
      repayments,
      summary: buildRepaymentSummary(loan, repayments),
      schedule: buildPaymentSchedule(loan, buildRepaymentSummary(loan, repayments)),
    });
  } catch (error) {
    console.error('Get loan repayments error:', error);
    res.status(500).json({ message: 'Server error while fetching loan repayments', error: error.message });
  } finally {
    connection.release();
  }
};

const recordRepayment = async (req, res) => {
  const connection = await getConnection();

  try {
    const { id } = req.params;
    const { amount, payment_date, payment_method, reference_note } = req.body;
    const amountPaid = roundCurrency(amount);

    if (!(amountPaid > 0)) {
      return res.status(400).json({ message: 'Repayment amount must be greater than zero' });
    }

    const [loanRows] = await connection.execute(
      'SELECT id, client_id, loan_reference, amount, duration, monthly_payment, status, application_date, decision_date FROM loans WHERE id = ?',
      [id],
    );

    if (!loanRows.length) {
      return res.status(404).json({ message: 'Loan not found' });
    }

    const loan = loanRows[0];
    const isAdminUser = (req.user?.roles || []).some((role) => String(role).toLowerCase() === 'admin');
    if (!isAdminUser && Number(loan.client_id) !== Number(req.user?.userId)) {
      return res.status(403).json({ message: 'You can only record repayments for your own loans' });
    }

    if (String(loan.status).toLowerCase() !== 'approved') {
      return res.status(400).json({ message: 'Repayments can only be recorded for approved loans' });
    }

    const existingRepayments = await fetchLoanRepayments(connection, id);
    const currentSummary = buildRepaymentSummary(loan, existingRepayments);

    if (amountPaid > currentSummary.remainingBalance && currentSummary.remainingBalance > 0) {
      return res.status(400).json({
        message: `Repayment exceeds remaining balance of $${currentSummary.remainingBalance.toFixed(2)}`,
      });
    }

    const normalizedPaymentDate = payment_date || new Date().toISOString().slice(0, 10);
    const recordedByUserId = await resolveRecordedByUserId(
      connection,
      req.user?.userId || null,
    );

    const proofOfPaymentPath = req.file ? req.file.path : null;

    await connection.execute(
      `INSERT INTO loan_repayments (
          loan_id,
          amount_paid,
          payment_date,
          payment_method,
          reference_note,
          proof_of_payment_path,
          recorded_by_user_id,
          created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        amountPaid,
        normalizedPaymentDate,
        toNullableValue(payment_method),
        toNullableValue(reference_note),
        toNullableValue(proofOfPaymentPath),
        recordedByUserId,
      ],
    );

    await logAudit(
      recordedByUserId,
      req.user?.username || req.user?.email || 'Unknown User',
      'LOAN_REPAYMENT_RECORDED',
      'loan',
      id,
      `Repayment of $${amountPaid.toFixed(2)} recorded for loan ${loan.loan_reference}`,
      req.ip || req.connection?.remoteAddress || 'Unknown IP',
    );

    const repayments = await fetchLoanRepayments(connection, id);
    res.status(201).json({
      message: 'Repayment recorded successfully',
      repayments,
      summary: buildRepaymentSummary(loan, repayments),
      schedule: buildPaymentSchedule(loan, buildRepaymentSummary(loan, repayments)),
    });
  } catch (error) {
    console.error('Record repayment error:', error);
    res.status(500).json({ message: 'Server error while recording repayment', error: error.message });
  } finally {
    connection.release();
  }
};

const viewRepaymentProof = async (req, res) => {
  const connection = await getConnection();

  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(403).json({ message: 'Invalid filename' });
    }

    const [rows] = await connection.execute(
      `SELECT
          lr.proof_of_payment_path,
          l.client_id
       FROM loan_repayments lr
       JOIN loans l ON l.id = lr.loan_id
       WHERE lr.proof_of_payment_path LIKE ?
       LIMIT 1`,
      [`%${filename}`],
    );

    if (!rows.length || !rows[0].proof_of_payment_path) {
      return res.status(404).json({ message: 'Proof of payment not found' });
    }

    const isAdminUser = (req.user?.roles || []).some((role) => String(role).toLowerCase() === 'admin');
    if (!isAdminUser && Number(rows[0].client_id) !== Number(req.user?.userId)) {
      return res.status(403).json({ message: 'You can only access proof files for your own loans' });
    }

    const proofPath = path.resolve(rows[0].proof_of_payment_path);
    if (!fs.existsSync(proofPath)) {
      return res.status(404).json({ message: 'Proof file is missing from storage' });
    }

    const extension = path.extname(proofPath).toLowerCase();
    const contentTypeMap = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', contentTypeMap[extension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(proofPath)}"`);
    res.sendFile(proofPath);
  } catch (error) {
    console.error('View repayment proof error:', error);
    res.status(500).json({ message: 'Server error while loading proof of payment', error: error.message });
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
  getLoanRepayments,
  recordRepayment,
  viewRepaymentProof,
  generateRejectionReason,
  analyzeEcoCashStatement,
};
