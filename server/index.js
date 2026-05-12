const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const salesRoutes = require('./routes/sales');
const predictionsRoutes = require('./routes/predictions');
const insightsRoutes = require('./routes/insights');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (req, res) => res.json({ message: 'RevenueIQ API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/insights', insightsRoutes);

const PORT = process.env.PORT || 8000;

initDB().then(() => {
  app.listen(PORT, () => console.log(`RevenueIQ server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});