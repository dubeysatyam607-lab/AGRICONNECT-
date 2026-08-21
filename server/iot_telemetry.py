"""AgriConnect IoT Ingestion Engine.

FastAPI webhook to receive live soil moisture, NPK, and temperature
telemetry data from ESP32 edge nodes.
"""

from datetime import datetime
from typing import Dict, Optional
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(
    title="AgriConnect IoT Ingestion Engine",
    description="Real-time IoT soil sensor telemetry ingestion for AgriConnect Farm OS",
    version="1.0.0",
)

# Secret token required from ESP32 hardware devices
IOT_DEVICE_SECRET = "AGRI_ESP32_SECRET_KEY_2026"


class SoilTelemetryPayload(BaseModel):
    device_id: str = Field(..., example="ESP32-NODE-01")
    farm_id: str = Field(..., example="FARM-UP-7821")
    moisture_percentage: float = Field(..., ge=0.0, le=100.0, example=42.5)
    soil_temperature_celsius: float = Field(..., ge=-10.0, le=60.0, example=24.8)
    nitrogen_ppm: Optional[float] = Field(None, ge=0.0, example=45.0)
    phosphorus_ppm: Optional[float] = Field(None, ge=0.0, example=28.0)
    potassium_ppm: Optional[float] = Field(None, ge=0.0, example=110.0)
    ph_level: Optional[float] = Field(None, ge=0.0, le=14.0, example=6.8)
    battery_voltage: float = Field(..., ge=2.5, le=5.0, example=3.7)


# In-memory real-time state for live frontend dashboard sync
LATEST_FARM_TELEMETRY: Dict[str, dict] = {}


def verify_device_token(x_device_token: str = Header(...)):
    if x_device_token != IOT_DEVICE_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid IoT Device Secret Token",
        )
    return x_device_token


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "iot-telemetry"}


@app.post("/api/v1/telemetry/soil", status_code=status.HTTP_201_CREATED)
async def ingest_soil_telemetry(
    payload: SoilTelemetryPayload, token: str = Depends(verify_device_token)
):
    """Receives and validates ESP32 telemetry packet."""
    record = {
        **payload.model_dump(),
        "recorded_at": datetime.utcnow().isoformat() + "Z",
        "irrigation_needed": payload.moisture_percentage < 30.0,
        "health_status": (
            "optimal" if payload.moisture_percentage >= 35.0 else "dry"
        ),
    }

    # Store latest reading indexed by farm_id
    LATEST_FARM_TELEMETRY[payload.farm_id] = record

    return {
        "status": "success",
        "message": "Telemetry received and validated",
        "irrigation_needed": record["irrigation_needed"],
        "server_time": record["recorded_at"],
    }


@app.get("/api/v1/telemetry/{farm_id}/live")
async def get_live_farm_telemetry(farm_id: str):
    """Endpoint consumed by AgriConnect Frontend Dashboard."""
    if farm_id not in LATEST_FARM_TELEMETRY:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No telemetry data found for farm ID '{farm_id}'",
        )
    return LATEST_FARM_TELEMETRY[farm_id]
