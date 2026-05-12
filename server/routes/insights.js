const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');

const router = express.Router();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

router.use(authMiddleware);

router.get('/summary', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT date, revenue, quantity FROM sales_data WHERE user_id = $1 ORDER BY date ASC',
      [req.user.userId]
    );

    if (result.rows.length < 7) {
      return res.status(400).json({ message: 'Need at least 7 sales records' });
    }

    const salesData = result.rows.map(s => ({
      date: new Date(s.date).toISOString().split('T')[0],
      revenue: parseFloat(s.revenue),
      quantity: s.quantity ? parseFloat(s.quantity) : null
    }));

    const mlResponse = await axios.post(`${ML_URL}/insights/summary`, {
      sales_data: salesData,
      business_type: req.user.businessType
    });

    res.json(mlResponse.data);
  } catch (error) {
    if (error.response) return res.status(400).json({ message: error.response.data.detail });
    res.status(500).json({ message: 'Insights error', error: error.message });
  }
});

router.post('/ai-explain', async (req, res) => {
  try {
    const { prediction_type, data } = req.body;

    const prompt = `You are a business analyst explaining data to a small business owner in simple language. No jargon.

Business type: ${req.user.businessType}
Prediction type: ${prediction_type}
Data: ${JSON.stringify(data)}

Give a clear 3-4 sentence explanation:
1. What this means for their business
2. One specific action to take
3. What to watch out for

Be friendly and encouraging.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    const geminiData = await response.json();
    if (geminiData.error) throw new Error(geminiData.error.message);
    const explanation = geminiData.candidates[0].content.parts[0].text;
    res.json({ explanation });
  } catch (error) {
    res.status(500).json({ message: 'AI explanation error', error: error.message });
  }
});

module.exports = router;