const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

router.use(authMiddleware);

async function getSalesData(userId) {
  const result = await pool.query(
    'SELECT date, revenue, quantity FROM sales_data WHERE user_id = $1 ORDER BY date ASC',
    [userId]
  );
  return result.rows.map(s => ({
    date: new Date(s.date).toISOString().split('T')[0],
    revenue: parseFloat(s.revenue),
    quantity: s.quantity ? parseFloat(s.quantity) : null
  }));
}

router.post('/forecast', async (req, res) => {
  try {
    const { forecast_days = 30 } = req.body;
    const salesData = await getSalesData(req.user.userId);

    if (salesData.length < 10) {
      return res.status(400).json({ message: 'Need at least 10 sales records for forecasting' });
    }

    const mlResponse = await axios.post(`${ML_URL}/forecast/revenue`, {
      sales_data: salesData,
      forecast_days,
      business_type: req.user.businessType
    });

    const id = uuidv4();
    await pool.query(
      'INSERT INTO predictions (id, type, forecast_data, user_id) VALUES ($1,$2,$3,$4)',
      [id, 'revenue_forecast', JSON.stringify(mlResponse.data), req.user.userId]
    );

    res.json({ ...mlResponse.data, predictionId: id });
  } catch (error) {
    if (error.response) return res.status(400).json({ message: error.response.data.detail });
    res.status(500).json({ message: 'Prediction error', error: error.message });
  }
});

router.post('/anomalies', async (req, res) => {
  try {
    const salesData = await getSalesData(req.user.userId);

    if (salesData.length < 10) {
      return res.status(400).json({ message: 'Need at least 10 sales records' });
    }

    const mlResponse = await axios.post(`${ML_URL}/anomaly/detect`, {
      sales_data: salesData,
      sensitivity: 0.1
    });

    const anomalies = mlResponse.data.anomalies.filter(a => a.is_anomaly);
    for (const anomaly of anomalies) {
      const id = `${req.user.userId}-${anomaly.date}`;
      await pool.query(
        `INSERT INTO alerts (id, type, message, severity, date, revenue, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [id, 'anomaly', anomaly.message,
         Math.abs(anomaly.deviation_percent) > 50 ? 'high' : 'medium',
         anomaly.date, anomaly.revenue, req.user.userId]
      );
    }

    res.json(mlResponse.data);
  } catch (error) {
    if (error.response) return res.status(400).json({ message: error.response.data.detail });
    res.status(500).json({ message: 'Anomaly detection error', error: error.message });
  }
});

router.post('/inventory', async (req, res) => {
  try {
    const salesData = await getSalesData(req.user.userId);
    const withQuantity = salesData.filter(s => s.quantity);

    if (withQuantity.length < 10) {
      return res.status(400).json({ message: 'Need at least 10 records with quantity data' });
    }

    const mlResponse = await axios.post(`${ML_URL}/forecast/inventory`, {
      sales_data: withQuantity,
      business_type: req.user.businessType
    });

    res.json(mlResponse.data);
  } catch (error) {
    if (error.response) return res.status(400).json({ message: error.response.data.detail });
    res.status(500).json({ message: 'Inventory forecast error', error: error.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM alerts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/alerts/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE alerts SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;