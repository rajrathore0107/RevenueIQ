from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import forecast, anomaly, insights
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(
    title="RevenueIQ ML Service",
    description="AI-powered predictive analytics for small businesses",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router, prefix="/forecast", tags=["Forecasting"])
app.include_router(anomaly.router, prefix="/anomaly", tags=["Anomaly Detection"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])

@app.get("/")
def root():
    return {
        "service": "RevenueIQ ML Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}