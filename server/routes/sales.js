const express = require('express');
const { pool } = require('../db');
const authMiddleware = require('../middleware/auth');
const csv = require('csv-parser');
const multer = require('multer');
const { Readable } = require('stream');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const result = await pool.query(
      'SELECT * FROM sales_data WHERE user_id = $1 ORDER BY date DESC LIMIT $2 OFFSET $3',
      [req.user.userId, parseInt(limit), parseInt(offset)]
    );
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM sales_data WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({ sales: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { date, revenue, quantity, product, category, notes } = req.body;
    if (!date || !revenue) {
      return res.status(400).json({ message: 'Date and revenue are required' });
    }

    const id = uuidv4();
    const result = await pool.query(
      'INSERT INTO sales_data (id, date, revenue, quantity, product, category, notes, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [id, date, parseFloat(revenue), quantity ? parseFloat(quantity) : null, product || null, category || null, notes || null, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream.pipe(csv())
        .on('data', (row) => {
          const keys = Object.keys(row).map(k => k.toLowerCase().trim());
          const values = Object.values(row);

          const dateKey = keys.findIndex(k => k.includes('date') || k.includes('day'));
          const revenueKey = keys.findIndex(k => k.includes('revenue') || k.includes('sales') || k.includes('amount') || k.includes('total'));
          const quantityKey = keys.findIndex(k => k.includes('quantity') || k.includes('qty') || k.includes('units'));

          if (dateKey !== -1 && revenueKey !== -1) {
            const dateVal = values[dateKey];
            const revenueVal = parseFloat(String(values[revenueKey]).replace(/[^0-9.-]/g, ''));
            if (dateVal && !isNaN(revenueVal)) {
              results.push({
                id: uuidv4(),
                date: new Date(dateVal).toISOString().split('T')[0],
                revenue: revenueVal,
                quantity: quantityKey !== -1 ? parseFloat(values[quantityKey]) || null : null,
                userId: req.user.userId
              });
            }
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ message: 'No valid data found. Make sure CSV has date and revenue columns.' });
    }

    for (const record of results) {
      await pool.query(
        'INSERT INTO sales_data (id, date, revenue, quantity, user_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [record.id, record.date, record.revenue, record.quantity, record.userId]
      );
    }

    res.json({ message: `Successfully imported ${results.length} records`, count: results.length });
  } catch (error) {
    res.status(500).json({ message: 'CSV upload error', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM sales_data WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;