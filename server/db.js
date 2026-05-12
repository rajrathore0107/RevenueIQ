const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        business_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales_data (
        id VARCHAR(50) PRIMARY KEY,
        date DATE NOT NULL,
        revenue DECIMAL(12,2) NOT NULL,
        quantity DECIMAL(10,2),
        product VARCHAR(255),
        category VARCHAR(255),
        notes TEXT,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS predictions (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        forecast_data JSONB NOT NULL,
        insights JSONB,
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        generated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        date VARCHAR(50),
        revenue DECIMAL(12,2),
        user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables initialized');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };