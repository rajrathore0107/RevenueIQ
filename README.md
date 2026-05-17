# RevenueIQ

**AI-Powered Predictive Analytics for Small Businesses**

RevenueIQ helps small business owners predict future revenue, detect anomalies, and get actionable insights — all powered by machine learning.

---

## Live URLs

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | https://revenueiq.vercel.app | Vercel |
| Backend API | https://revenueiq-api.onrender.com | Render |
| ML Service | https://revenueiq-ml.onrender.com | Render |

> Services hosted on Render free tier may take ~30 seconds to cold-start on the first request.

---

## Features

- **Revenue Forecasting** — Predict future revenue using Facebook Prophet with weekly and yearly seasonality
- **Anomaly Detection** — Identify unusual revenue patterns using Isolation Forest ML model
- **Business Insights** — Get performance analysis, best/worst days, consistency ratings and recommendations
- **AI Explanations** — Natural language explanations of ML predictions
- **Interactive Dashboard** — Visualize trends, forecasts and anomalies with Recharts
- **CSV Upload** — Bulk upload historical sales data via CSV files
- **Smart Alerts** — Auto-generated alerts for detected anomalies with severity levels
- **Auth System** — JWT-based user authentication with secure registration/login

---

## Architecture

```
React App  ──────>  Express API  ──────>  FastAPI ML Service
 (Vercel)            (Render)              (Render / Docker)
                        |
                        |                  - Prophet (Forecast)
                        |                  - IsolationForest (Anomaly)
                        v                  - KMeans (Insights)
                    PostgreSQL
                     (Render)
```

---

## Project Structure

```
RevenueIQ/
|
|-- client/                        # React Frontend
|   |-- public/
|   |   |-- index.html             # HTML entry point
|   |   |-- manifest.json          # PWA manifest
|   |-- src/
|   |   |-- api.js                 # Axios API client
|   |   |-- App.js                 # Router setup
|   |   |-- pages/
|   |       |-- Dashboard.js       # Main dashboard (6 tabs)
|   |       |-- Login.js           # Login page
|   |       |-- Register.js        # Registration page
|   |-- vercel.json                # Vercel SPA routing config
|   |-- package.json
|
|-- server/                        # Node.js / Express Backend
|   |-- index.js                   # Express server entry
|   |-- db.js                      # PostgreSQL connection and schema
|   |-- middleware/                 # JWT auth middleware
|   |-- routes/
|       |-- auth.js                # Register / Login endpoints
|       |-- sales.js               # CRUD + CSV upload
|       |-- predictions.js         # Proxy to ML service
|       |-- insights.js            # Proxy to ML insights
|
|-- ml/                            # Python / FastAPI ML Service
|   |-- main.py                    # FastAPI server entry
|   |-- Dockerfile                 # Docker build (Python 3.11.9 + CmdStan)
|   |-- requirements.txt           # Python dependencies
|   |-- render.yaml                # Render deploy config
|   |-- routers/
|       |-- forecast.py            # Prophet-based revenue forecasting
|       |-- anomaly.py             # Isolation Forest anomaly detection
|       |-- insights.py            # KMeans clustering and recommendations
|
|-- render.yaml                    # Root Render deploy config
|-- README.md
```

---

## Tech Stack

**Frontend**

| Technology | Purpose |
|-----------|---------|
| React 19 | UI framework |
| React Router v7 | Client-side routing |
| Recharts | Charts and data visualization |
| Axios | HTTP client |

**Backend**

| Technology | Purpose |
|-----------|---------|
| Express 5 | REST API server |
| PostgreSQL | Database |
| JWT | Authentication |
| BullMQ + Redis | Job queue (alerts) |
| Multer | CSV file uploads |

**ML Service**

| Technology | Purpose |
|-----------|---------|
| FastAPI | ML API server |
| Facebook Prophet | Time-series forecasting |
| Scikit-learn | Anomaly detection and clustering |
| Pandas + NumPy | Data processing |
| Docker | Containerized deployment |

---

## Getting Started (Local Development)

**Prerequisites:** Node.js 18+, Python 3.11, PostgreSQL, Redis (optional)

**1. Clone the repo**

```bash
git clone https://github.com/rajrathore0107/RevenueIQ.git
cd RevenueIQ
```

**2. Backend Setup**

```bash
cd server
npm install
cp .env.example .env    # Configure your DB credentials
npm run dev
```

**3. ML Service Setup**

```bash
cd ml
pip install -r requirements.txt
python -m cmdstanpy.install_cmdstan
uvicorn main:app --host 0.0.0.0 --port 8001
```

**4. Frontend Setup**

```bash
cd client
npm install
npm start
```

The app will be running at http://localhost:3000

---

## API Endpoints

**Auth**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Login and get JWT token |

**Sales**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sales | Get all sales records |
| POST | /api/sales | Add a sale record |
| DELETE | /api/sales/:id | Delete a sale record |
| POST | /api/sales/upload-csv | Bulk upload via CSV |

**Predictions**

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/predictions/forecast | Revenue forecast (7-90 days) |
| POST | /api/predictions/anomalies | Detect revenue anomalies |
| POST | /api/predictions/inventory | Inventory demand forecast |
| GET | /api/predictions/alerts | Get anomaly alerts |

**Insights**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/insights/summary | Business performance insights |
| POST | /api/insights/ai-explain | AI explanation of predictions |

---

## License

This project is open source and available under the MIT License.

---

Built by [Raj Rathore](https://github.com/rajrathore0107)
