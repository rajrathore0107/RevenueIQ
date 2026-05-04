from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
from typing import List, Optional

router = APIRouter()

class SalesRecord(BaseModel):
    date: str
    revenue: float
    quantity: Optional[float] = None

class AnomalyRequest(BaseModel):
    sales_data: List[SalesRecord]
    sensitivity: float = 0.1

class AnomalyPoint(BaseModel):
    date: str
    revenue: float
    is_anomaly: bool
    anomaly_score: float
    deviation_percent: float
    message: str

class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyPoint]
    total_anomalies: int
    anomaly_rate: float
    summary: str

@router.post("/detect", response_model=AnomalyResponse)
def detect_anomalies(request: AnomalyRequest):
    try:
        if len(request.sales_data) < 10:
            raise HTTPException(
                status_code=400,
                detail="Need at least 10 data points for anomaly detection"
            )

        df = pd.DataFrame([{
            "date": pd.to_datetime(record.date),
            "revenue": record.revenue
        } for record in request.sales_data])

        df = df.sort_values("date").reset_index(drop=True)

        df["day_of_week"] = df["date"].dt.dayofweek
        df["day_of_month"] = df["date"].dt.day
        df["month"] = df["date"].dt.month
        df["rolling_mean_7"] = df["revenue"].rolling(window=7, min_periods=1).mean()
        df["rolling_std_7"] = df["revenue"].rolling(window=7, min_periods=1).std().fillna(0)
        df["deviation_from_mean"] = df["revenue"] - df["rolling_mean_7"]

        features = df[[
            "revenue",
            "day_of_week",
            "rolling_mean_7",
            "rolling_std_7",
            "deviation_from_mean"
        ]].fillna(0)

        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)

        model = IsolationForest(
            contamination=request.sensitivity,
            random_state=42,
            n_estimators=100
        )
        predictions = model.fit_predict(features_scaled)
        scores = model.score_samples(features_scaled)

        anomaly_points = []
        for idx, row in df.iterrows():
            is_anomaly = predictions[idx] == -1
            score = float(scores[idx])
            rolling_mean = float(row["rolling_mean_7"])
            deviation_pct = ((row["revenue"] - rolling_mean) / rolling_mean * 100) if rolling_mean > 0 else 0

            if is_anomaly:
                if deviation_pct > 0:
                    message = f"Unusually high revenue — {deviation_pct:.1f}% above 7-day average"
                else:
                    message = f"Unusually low revenue — {abs(deviation_pct):.1f}% below 7-day average"
            else:
                message = "Normal"

            anomaly_points.append(AnomalyPoint(
                date=row["date"].strftime("%Y-%m-%d"),
                revenue=float(row["revenue"]),
                is_anomaly=is_anomaly,
                anomaly_score=round(score, 4),
                deviation_percent=round(deviation_pct, 2),
                message=message
            ))

        anomalies = [p for p in anomaly_points if p.is_anomaly]
        anomaly_rate = len(anomalies) / len(anomaly_points) * 100

        if len(anomalies) == 0:
            summary = "No anomalies detected. Revenue patterns are consistent."
        elif len(anomalies) <= 3:
            summary = f"Found {len(anomalies)} anomalies. Minor irregularities in revenue pattern."
        else:
            summary = f"Found {len(anomalies)} anomalies ({anomaly_rate:.1f}% of days). Significant revenue irregularities detected — review recommended."

        return AnomalyResponse(
            anomalies=anomaly_points,
            total_anomalies=len(anomalies),
            anomaly_rate=round(anomaly_rate, 2),
            summary=summary
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly detection error: {str(e)}")