from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
from typing import List, Optional

router = APIRouter()

class SalesRecord(BaseModel):
    date: str
    revenue: float
    quantity: Optional[float] = None

class InsightsRequest(BaseModel):
    sales_data: List[SalesRecord]
    business_type: str = "retail"

@router.post("/summary")
def get_insights(request: InsightsRequest):
    try:
        if len(request.sales_data) < 7:
            raise HTTPException(
                status_code=400,
                detail="Need at least 7 data points"
            )

        df = pd.DataFrame([{
            "date": pd.to_datetime(record.date),
            "revenue": record.revenue
        } for record in request.sales_data])

        df = df.sort_values("date").reset_index(drop=True)
        df["day_of_week"] = df["date"].dt.day_name()
        df["month"] = df["date"].dt.month_name()
        df["week"] = df["date"].dt.isocalendar().week.astype(int)

        total_revenue = float(df["revenue"].sum())
        avg_daily = float(df["revenue"].mean())
        best_day_idx = df["revenue"].idxmax()
        worst_day_idx = df["revenue"].idxmin()
        best_day = df.loc[best_day_idx, "date"].strftime("%Y-%m-%d")
        worst_day = df.loc[worst_day_idx, "date"].strftime("%Y-%m-%d")
        best_revenue = float(df.loc[best_day_idx, "revenue"])
        worst_revenue = float(df.loc[worst_day_idx, "revenue"])

        day_performance = df.groupby("day_of_week")["revenue"].mean().to_dict()
        best_weekday = max(day_performance, key=day_performance.get)
        worst_weekday = min(day_performance, key=day_performance.get)

        recent_7 = float(df.tail(7)["revenue"].mean())
        previous_7 = float(df.iloc[-14:-7]["revenue"].mean()) if len(df) >= 14 else avg_daily
        week_growth = ((recent_7 - previous_7) / previous_7 * 100) if previous_7 > 0 else 0

        std_dev = float(df["revenue"].std())
        cv = (std_dev / avg_daily * 100) if avg_daily > 0 else 0
        consistency = "very consistent" if cv < 15 else "consistent" if cv < 30 else "variable" if cv < 50 else "highly variable"

        return {
            "overview": {
                "total_revenue": round(total_revenue, 2),
                "average_daily_revenue": round(avg_daily, 2),
                "data_points": len(df),
                "date_range": f"{df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}"
            },
            "performance": {
                "best_day": {"date": best_day, "revenue": best_revenue},
                "worst_day": {"date": worst_day, "revenue": worst_revenue},
                "best_weekday": best_weekday,
                "worst_weekday": worst_weekday,
                "week_over_week_growth": round(week_growth, 2)
            },
            "consistency": {
                "rating": consistency,
                "coefficient_of_variation": round(cv, 2),
                "standard_deviation": round(std_dev, 2)
            },
            "day_of_week_performance": {
                day: round(float(avg), 2)
                for day, avg in day_performance.items()
            },
            "recommendations": generate_recommendations(
                week_growth, consistency, best_weekday,
                worst_weekday, request.business_type
            )
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insights error: {str(e)}")


def generate_recommendations(growth, consistency, best_day, worst_day, business_type):
    recs = []

    if growth < -10:
        recs.append({
            "priority": "high",
            "type": "alert",
            "message": f"Revenue dropped {abs(growth):.1f}% this week. Consider running a promotion or reviewing pricing."
        })
    elif growth > 20:
        recs.append({
            "priority": "info",
            "type": "opportunity",
            "message": f"Strong growth of {growth:.1f}% this week. Consider increasing inventory to meet demand."
        })

    if consistency in ["variable", "highly variable"]:
        recs.append({
            "priority": "medium",
            "type": "stability",
            "message": f"Revenue is {consistency}. Consider loyalty programs or subscriptions to stabilize income."
        })

    recs.append({
        "priority": "info",
        "type": "timing",
        "message": f"{best_day} is your best performing day. Schedule promotions and ensure full staffing."
    })

    recs.append({
        "priority": "low",
        "type": "timing",
        "message": f"{worst_day} is your slowest day. Consider special offers or reduced hours to optimize costs."
    })

    if business_type == "restaurant":
        recs.append({
            "priority": "info",
            "type": "seasonal",
            "message": "Track weather patterns — restaurants often see 15-20% revenue changes on rainy vs sunny days."
        })

    return recs