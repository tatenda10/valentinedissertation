const { getConnection } = require('../../config/database');

// Generate Loan Summary Report
const generateLoanSummaryReport = async (req, res) => {
  const connection = await getConnection();
  try {
    const [summary] = await connection.execute(`
      SELECT 
        COUNT(*) AS totalLoans,
        SUM(amount) AS totalAmount,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedLoans,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejectedLoans,
        AVG(amount) AS averageLoanAmount
      FROM loans
    `);

    res.json({ summary: summary[0] });
  } catch (error) {
    console.error('Error generating loan summary report:', error);
    res.status(500).json({ message: 'Server error while generating report', error: error.message });
  } finally {
    connection.release();
  }
};

// Generate Client Demographics Report
const generateClientDemographicsReport = async (req, res) => {
  const connection = await getConnection();
  try {
    const [demographics] = await connection.execute(`
      SELECT 
        employment_status,
        COUNT(*) AS clientCount,
        AVG(monthly_income) AS averageIncome
      FROM clients
      GROUP BY employment_status
    `);

    res.json({ demographics });
  } catch (error) {
    console.error('Error generating client demographics report:', error);
    res.status(500).json({ message: 'Server error while generating report', error: error.message });
  } finally {
    connection.release();
  }
};

// Generate Approved Loans by Gender Report
const generateApprovedLoansByGenderReport = async (req, res) => {
  const connection = await getConnection();
  try {
    const [report] = await connection.execute(`
      SELECT 
        clients.gender,
        COUNT(loans.id) AS approvedLoans
      FROM loans
      JOIN clients ON loans.client_id = clients.id
      WHERE loans.status = 'approved'
      GROUP BY clients.gender
    `);

    res.json({ report });
  } catch (error) {
    console.error('Error generating approved loans by gender report:', error);
    res.status(500).json({ message: 'Server error while generating report', error: error.message });
  } finally {
    connection.release();
  }
};

// Generate Loans by Month Report
const generateLoansByMonthReport = async (req, res) => {
  const connection = await getConnection();
  try {
    const [report] = await connection.execute(`
      SELECT 
        DATE_FORMAT(loans.application_date, '%Y-%m') AS month,
        COUNT(loans.id) AS totalLoans
      FROM loans
      GROUP BY month
      ORDER BY month
    `);

    res.json({ report });
  } catch (error) {
    console.error('Error generating loans by month report:', error);
    res.status(500).json({ message: 'Server error while generating report', error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  generateLoanSummaryReport,
  generateClientDemographicsReport,
  generateApprovedLoansByGenderReport,
  generateLoansByMonthReport,
  // Add more report functions as needed
};
