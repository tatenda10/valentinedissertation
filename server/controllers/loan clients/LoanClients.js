const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { getConnection } = require('../../config/database');

// Helper function to generate JWT token
const generateToken = (userId, username, roles) => {
  return jwt.sign({ userId, username, roles }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

// Helper function to hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Register a new loan client
const register = async (req, res) => {
  const connection = await getConnection();
  try {
    // Validate request body
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      Gender,
      address,
      dateOfBirth,
      employmentStatus,
      monthlyIncome
    } = req.body;

    // Check if client already exists
    const [existingClients] = await connection.execute(
      'SELECT id FROM clients WHERE email = ?',
      [email]
    );

    if (existingClients.length > 0) {
      return res.status(400).json({
        message: 'Client already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Handle potentially undefined address fields
    const addressStreet = address?.street || null;
    const addressCity = address?.city || null;
    const addressState = address?.state || null;
    const addressZipCode = address?.zipCode || null;
    const addressCountry = address?.country || null;

    // Insert new client
    const toNull = (v) => (v === undefined || v === "" ? null : v);
    const [result] = await connection.execute(
      `INSERT INTO clients (
        email, password, first_name, last_name, phone_number, Gender,
        address_street, address_city, address_state, address_zip_code, address_country,
        date_of_birth, employment_status, monthly_income, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
  toNull(email),
  toNull(hashedPassword),
  toNull(firstName),
  toNull(lastName),
  toNull(phoneNumber),
  toNull(Gender),

  toNull(addressStreet),
  toNull(addressCity),
  toNull(addressState),
  toNull(addressZipCode),
  toNull(addressCountry),

  dateOfBirth ? new Date(dateOfBirth) : null,
  toNull(employmentStatus),
  monthlyIncome ?? 0
]
    );

    const clientId = result.insertId;
    const token = generateToken(clientId, email, ['loan_client']);

    res.status(201).json({
      message: 'Registration successful',
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Login loan client
const login = async (req, res) => {
  const connection = await getConnection();
  try {
    const { email, password } = req.body;

    // Find client by email
    const [clients] = await connection.execute(
      'SELECT * FROM clients WHERE email = ?',
      [email]
    );

    if (clients.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const client = clients[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, client.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(client.id, client.email, ['loan_client']);

    // Remove password from client object
    delete client.password;

    res.json({
      message: 'Login successful',
      token,
      client
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get current client profile
const getCurrentUser = async (req, res) => {
  const connection = await getConnection();
  try {
    const [clients] = await connection.execute(
      `SELECT id, email, first_name, last_name, phone_number,
        address_street, address_city, address_state, address_zip_code, address_country,
        date_of_birth, employment_status, monthly_income, created_at
      FROM clients WHERE id = ?`,
      [req.user.userId]
    );

    if (clients.length === 0) {
      return res.status(404).json({
        message: 'Client not found'
      });
    }

    res.json({
      client: clients[0]
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      message: 'Server error while fetching client data',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update client profile
const updateProfile = async (req, res) => {
  const connection = await getConnection();
  try {
    const updates = {
      first_name: req.body.firstName,
      last_name: req.body.lastName,
      phone_number: req.body.phoneNumber,
      address_street: req.body.address?.street,
      address_city: req.body.address?.city,
      address_state: req.body.address?.state,
      address_zip_code: req.body.address?.zipCode,
      address_country: req.body.address?.country,
      employment_status: req.body.employmentStatus,
      monthly_income: req.body.monthlyIncome
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    // Build the SQL query dynamically
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = [...Object.values(updates), req.user.userId];

    const [result] = await connection.execute(
      `UPDATE clients SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: 'Client not found'
      });
    }

    res.json({
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error while updating profile',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get all clients
const getAllClients = async (req, res) => {
  const connection = await getConnection();
  try {
    const [clients] = await connection.execute(
      `SELECT id, email, first_name, last_name, phone_number,
        address_street, address_city, address_state, address_zip_code, address_country,
        date_of_birth, employment_status, monthly_income, created_at
      FROM clients`
    );

    res.json({
      clients
    });

  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({
      message: 'Server error while fetching clients',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  updateProfile,
  getAllClients
};
