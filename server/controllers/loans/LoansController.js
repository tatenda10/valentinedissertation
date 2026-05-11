const { getConnection } = require('../../config/database');
const { makeLoanDecision } = require('../../utils/creditScoring');
const { logAudit } = require('../../utils/auditLogger');

const generateLoanReference = () => {
  const prefix = 'LOAN';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
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

    const decision = makeLoanDecision({
      amount,
      duration,
      monthlyIncome,
      employmentStatus,
      existingLoans
    });

    const loanReference = generateLoanReference();
    const status = decision.status;
    const decisionReason = decision.decisionReason;
    const riskScore = decision.riskScore;

    const baseRate = 10;
    const riskPremium = Math.floor(Math.random() * 5);

    const interestRate = decision.approved
      ? decision.interestRate
      : baseRate + riskPremium;

    const totalAmount = Number(amount) * (1 + Number(interestRate) / 100);

    const monthlyPayment = decision.approved
      ? decision.monthlyPayment
      : totalAmount / Number(duration);

    const toNull = (v) => (v === undefined || v === '' ? null : v);

    const [result] = await connection.execute(
      `INSERT INTO loans (
        loan_reference, client_id, amount, purpose, duration,
        interest_rate, monthly_payment, status, decision_reason,
        risk_score, monthly_income, employment_status, existing_loans,
        application_date, decision_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        loanReference,
        clientId,
        Number(amount),
        toNull(purpose),
        Number(duration),
        interestRate,
        monthlyPayment,
        status,
        decisionReason,
        riskScore,
        toNull(monthlyIncome),
        toNull(employmentStatus),
        existingLoans ?? 0
      ]
    );

    const [loanDetails] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: `Loan application ${status}`,
      loan: loanDetails[0]
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
      existingLoans,
      clientId
    } = req.body;

    if (!amount || !purpose || !duration || !monthlyIncome || !clientId) {
      return res.status(400).json({ 
        message: 'Missing required fields' 
      });
    }

    const finalClientId = clientId || req.user?.userId;

    if (!finalClientId) {
      return res.status(400).json({ 
        message: 'Client ID not found' 
      });
    }

    const decision = makeLoanDecision({
      amount,
      duration,
      monthlyIncome,
      employmentStatus,
      existingLoans: existingLoans || '0'
    });

    const loanReference = generateLoanReference();
    const status = decision.status;
    const decisionReason = decision.decisionReason;
    const riskScore = decision.riskScore;

    const baseRate = 10;
    const riskPremium = Math.floor(Math.random() * 5);

    const interestRate = decision.approved
      ? decision.interestRate
      : baseRate + riskPremium;

    const totalAmount = Number(amount) * (1 + Number(interestRate) / 100);

    const monthlyPayment = decision.approved
      ? decision.monthlyPayment
      : totalAmount / Number(duration);

    const toNull = (v) => (v === undefined || v === '' ? null : v);

    const [result] = await connection.execute(
      `INSERT INTO loans (
        loan_reference, client_id, amount, purpose, duration,
        interest_rate, monthly_payment, status, decision_reason,
        risk_score, monthly_income, employment_status, existing_loans,
        statement_path, application_date, decision_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        loanReference,
        finalClientId,
        Number(amount),
        toNull(purpose),
        Number(duration),
        interestRate,
        monthlyPayment,
        status,
        decisionReason,
        riskScore,
        toNull(monthlyIncome),
        toNull(employmentStatus),
        existingLoans ?? 0,
        req.file.path
      ]
    );

    const [loanDetails] = await connection.execute(
      `SELECT l.*, c.first_name, c.last_name, c.email, c.phone_number
       FROM loans l
       JOIN clients c ON l.client_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: `Loan application ${status} with PDF statement`,
      loan: loanDetails[0],
      pdfFile: req.file.filename
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

    res.json({ loans });

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
    res.json({ loan: loans[0] });

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

    res.json({ loans, summary });

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
    const requestedAmount = parseFloat(loan.amount);
    const monthlyIncome = parseFloat(loan.monthly_income || loan.client_income || 0);
    const existingLoans = parseInt(loan.existing_loans || 0);
    const employmentStatus = loan.employment_status || 'unknown';
    const riskScore = parseInt(loan.risk_score || 0);
    const duration = parseInt(loan.duration || 12);
    const interestRate = parseFloat(loan.interest_rate || 14);
    
    const maxMonthlyPayment = monthlyIncome * 0.3;
    const maxAffordableLoan = (maxMonthlyPayment * duration) / (1 + (interestRate / 100));
    
    const reasons = [];
    
    if (monthlyIncome < 300) {
      reasons.push(`Monthly income of $${monthlyIncome.toFixed(2)} is below minimum requirement of $300`);
    }
    
    if (requestedAmount > maxAffordableLoan && maxAffordableLoan > 0) {
      reasons.push(`Requested $${requestedAmount.toFixed(2)} exceeds your maximum affordable loan of $${maxAffordableLoan.toFixed(2)} based on your monthly income of $${monthlyIncome.toFixed(2)}`);
    }
    
    if (existingLoans >= 2) {
      reasons.push(`You have ${existingLoans} existing active loan(s). Maximum allowed is 1`);
    }
    
    if (employmentStatus === 'unemployed') {
      reasons.push(`Employment status is "${employmentStatus}". Stable employment is required for loan approval`);
    }
    
    if (employmentStatus === 'self-employed' && monthlyIncome < 500) {
      reasons.push(`Self-employed with monthly income of $${monthlyIncome.toFixed(2)}. Minimum required for self-employed is $500`);
    }
    
    if (riskScore < 50 && riskScore > 0) {
      reasons.push(`Credit risk score of ${riskScore} is below the minimum threshold of 50`);
    }
    
    if (requestedAmount < 100) {
      reasons.push(`Loan amount $${requestedAmount.toFixed(2)} is below the minimum of $100`);
    }
    if (requestedAmount > 10000) {
      reasons.push(`Loan amount $${requestedAmount.toFixed(2)} exceeds the maximum of $10,000`);
    }
    
    if (monthlyIncome > 0) {
      const incomeToLoanRatio = (requestedAmount / monthlyIncome) * 100;
      if (incomeToLoanRatio > 200) {
        reasons.push(`Loan amount is ${incomeToLoanRatio.toFixed(0)}% of your monthly income. Maximum allowed is 200%`);
      }
    }
    
    if (reasons.length === 0) {
      return `Loan application does not meet our current approval criteria. Risk score: ${riskScore || 'Not calculated'}. Please review your application or contact support.`;
    }
    
    return reasons.join('. ');
    
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
      decision_reason = await generateRejectionReason(id);
      
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
      data: updatedLoan[0]
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
  generateRejectionReason
};