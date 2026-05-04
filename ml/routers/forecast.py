from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from prophet import Prophet
import pandas as pd
import numpy as np
from typing import List, Optional
import warnings
warnings.filterwarnings('ignore')

router = APIRouter()

class SalesRecord(BaseModel):
    date: str
    revenue: float
    quantity: Optional[float] = None

class ForecastRequest(BaseModel):
    sales_data: List[SalesRecord]
    forecast_days: int = 30
    business_type: str = "retail"

class ForecastPoint(BaseModel):
    date: str
    predicted: float
    lower_bound: float
    upper_bound: float

class ForecastResponse(BaseModel):
    forecast: List[ForecastPoint]
    trend: str
    growth_rate: float
    best_period: str
    worst_period: str
    summary: str

@router.post("/revenue", response_model=ForecastResponse)
def forecast_revenue(request: ForecastRequest):
    try:
        if len(request.sales_data) < 10:
            raise HTTPException(
                status_code=400,
                detail="Need at least 10 data points for forecasting"
            )

        df = pd.DataFrame([{
            "ds": pd.to_datetime(record.date),
            "y": record.revenue
        } for record in request.sales_data])

        df = df.sort_values("ds").reset_index(drop=True)

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10,
            interval_width=0.80
        )

        if request.business_type == "restaurant":
            model.add_seasonality(
                name="weekly_restaurant",
                period=7,
                fourier_order=3
            )

        model.fit(df)

        future = model.make_future_dataframe(
            periods=request.forecast_days,
            freq="D"
        )

        forecast_df = model.predict(future)
        future_only = forecast_df.tail(request.forecast_days)

        forecast_points = []
        for _, row in future_only.iterrows():
            forecast_points.append(ForecastPoint(
                date=row["ds"].strftime("%Y-%m-%d"),
                predicted=round(max(0, row["yhat"]), 2),
                lower_bound=round(max(0, row["yhat_lower"]), 2),
                upper_bound=round(max(0, row["yhat_upper"]), 2)
            ))

        historical_values = df["y"].values
        recent_avg = np.mean(historical_values[-7:]) if len(historical_values) >= 7 else np.mean(historical_values)
        older_avg = np.mean(historical_values[-30:-7]) if len(historical_values) >= 30 else np.mean(historical_values[:max(1, len(historical_values)//2)])

        growth_rate = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        trend = "growing" if growth_rate > 2 else "declining" if growth_rate < -2 else "stable"

        forecast_values = [p.predicted for p in forecast_points]
        best_idx = int(np.argmax(forecast_values))
        worst_idx = int(np.argmin(forecast_values))
        best_period = forecast_points[best_idx].date
        worst_period = forecast_points[worst_idx].date

        avg_forecast = np.mean(forecast_values)
        summary = f"Revenue is {trend} at {abs(growth_rate):.1f}% {'growth' if growth_rate > 0 else 'decline'}. "
        summary += f"Expected average daily revenue: {avg_forecast:,.0f}. "
        summary += f"Best day predicted: {best_period}, worst day: {worst_period}."

        return ForecastResponse(
            forecast=forecast_points,
            trend=trend,
            growth_rate=round(growth_rate, 2),
            best_period=best_period,
            worst_period=worst_period,
            summary=summary
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecasting error: {str(e)}")


@router.post("/inventory")
def forecast_inventory(request: ForecastRequest):
    try:
        if not request.sales_data or not request.sales_data[0].quantity:
            raise HTTPException(
                status_code=400,
                detail="Quantity data required for inventory forecasting"
            )

        df = pd.DataFrame([{
            "ds": pd.to_datetime(record.date),
            "y": record.quantity
        } for record in request.sales_data if record.quantity])

        df = df.sort_values("ds").reset_index(drop=True)

        if len(df) < 10:
            raise HTTPException(
                status_code=400,
                detail="Need at least 10 data points"
            )

        model = Prophet(
            yearly_seasonality=len(df) > 365,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.80
        )
        model.fit(df)

        future = model.make_future_dataframe(periods=30, freq="D")
        forecast_df = model.predict(future)
        future_only = forecast_df.tail(30)

        total_predicted = float(future_only["yhat"].clip(lower=0).sum())
        avg_daily = float(future_only["yhat"].clip(lower=0).mean())
        peak_day = future_only.loc[future_only["yhat"].idxmax(), "ds"].strftime("%Y-%m-%d")

        return {
            "total_units_needed_30_days": round(total_predicted, 0),
            "average_daily_units": round(avg_daily, 1),
            "peak_demand_day": peak_day,
            "reorder_recommendation": round(total_predicted * 1.15, 0),
            "message": f"Stock {round(total_predicted * 1.15, 0)} units for next 30 days with 15% safety buffer"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inventory forecast error: {str(e)}")