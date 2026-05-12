const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, businessName, businessType } = req.body;
    if (!name || !email || !password || !businessName || !businessType) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, email, password, business_name, business_type) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, name, email, hashedPassword, businessName, businessType]
    );

    const token = jwt.sign(
      { userId: id, name, email, businessType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id, name, email, businessName, businessType }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, name: user.name, email: user.email, businessType: user.business_type },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        businessName: user.business_name,
        businessType: user.business_type
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;