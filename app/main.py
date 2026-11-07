from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, date
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "vayal.db"
app = FastAPI(title="Vayal — AgriMach", version="0.1.0", description="Voice-first agricultural machinery marketplace")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with closing(connect()) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS machines (
            id TEXT PRIMARY KEY, owner_name TEXT NOT NULL, owner_phone TEXT NOT NULL,
            machine_type TEXT NOT NULL, title TEXT NOT NULL, village TEXT NOT NULL,
            district TEXT NOT NULL, landmark TEXT, rate_per_acre REAL NOT NULL CHECK(rate_per_acre >= 0),
            available INTEGER NOT NULL DEFAULT 1, description TEXT
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY, farmer_name TEXT NOT NULL, farmer_phone TEXT NOT NULL,
            machine_id TEXT, machine_type TEXT NOT NULL, acres REAL NOT NULL CHECK(acres > 0),
            booking_date TEXT NOT NULL, village TEXT NOT NULL, district TEXT NOT NULL,
            landmark TEXT, directions TEXT, latitude REAL, longitude REAL,
            estimated_total REAL, status TEXT NOT NULL DEFAULT 'requested', source TEXT NOT NULL DEFAULT 'app',
            created_at TEXT NOT NULL,
            FOREIGN KEY(machine_id) REFERENCES machines(id)
        );
        """)
        count = db.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
        if count == 0:
            demo = [
                ("m1","Demo Owner A","9000000001","Tractor","Tractor + plough","Pollachi","Coimbatore","Demo listing",1500,1,"Illustrative listing; verify before use"),
                ("m2","Demo Owner B","9000000002","Rotavator","Tractor rotavator","Kinathukadavu","Coimbatore","Demo listing",1800,1,"Illustrative listing; verify before use"),
                ("m3","Demo Owner C","9000000003","Harvester","Paddy combine harvester","Udumalpet","Tiruppur","Demo listing",2500,1,"Illustrative listing; verify before use")
            ]
            db.executemany("INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?,?)", demo)
        db.commit()


@app.on_event("startup")
def startup():
    init_db()


class MachineCreate(BaseModel):
    owner_name: str = Field(min_length=2, max_length=100)
    owner_phone: str = Field(min_length=8, max_length=20)
    machine_type: str = Field(min_length=2, max_length=60)
    title: str = Field(min_length=2, max_length=120)
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    landmark: str | None = None
    rate_per_acre: float = Field(ge=0, le=100000)
    description: str | None = None


class BookingCreate(BaseModel):
    farmer_name: str = Field(min_length=2, max_length=100)
    farmer_phone: str = Field(min_length=8, max_length=20)
    machine_type: str = Field(min_length=2, max_length=60)
    acres: float = Field(gt=0, le=10000)
    booking_date: date
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    landmark: str | None = None
    directions: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    machine_id: str | None = None
    source: Literal["app", "assistant", "phone"] = "app"

    @model_validator(mode="after")
    def gps_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        return self


class AssistantMessage(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    language: Literal["ta", "en"] = "ta"
    session: dict = Field(default_factory=dict)


@app.get("/", response_class=HTMLResponse)
def home():
    return (ROOT / "static" / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "vayal", "version": app.version}


@app.get("/api/machines")
def list_machines(district: str | None = None, machine_type: str | None = None):
    query = "SELECT * FROM machines WHERE available=1"
    args = []
    if district:
        query += " AND lower(district)=lower(?)"; args.append(district)
    if machine_type:
        query += " AND lower(machine_type)=lower(?)"; args.append(machine_type)
    query += " ORDER BY district, village"
    with closing(connect()) as db:
        return [dict(r) for r in db.execute(query, args).fetchall()]


@app.post("/api/machines", status_code=201)
def create_machine(payload: MachineCreate):
    machine_id = str(uuid4())
    with closing(connect()) as db:
        db.execute("INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?,?)", (machine_id, payload.owner_name, payload.owner_phone, payload.machine_type, payload.title, payload.village, payload.district, payload.landmark, payload.rate_per_acre, 1, payload.description))
        db.commit()
    return {"id": machine_id, "message": "Machine listing created"}


@app.patch("/api/machines/{machine_id}/availability")
def set_availability(machine_id: str, available: bool):
    with closing(connect()) as db:
        cur = db.execute("UPDATE machines SET available=? WHERE id=?", (int(available), machine_id))
        db.commit()
        if cur.rowcount == 0:
            raise HTTPException(404, "Machine not found")
    return {"id": machine_id, "available": available}


@app.post("/api/bookings", status_code=201)
def create_booking(payload: BookingCreate):
    machine = None
    if payload.machine_id:
        with closing(connect()) as db:
            machine = db.execute("SELECT * FROM machines WHERE id=? AND available=1", (payload.machine_id,)).fetchone()
        if machine is None:
            raise HTTPException(404, "Selected machine is not available")
        if machine["machine_type"].lower() != payload.machine_type.lower():
            raise HTTPException(422, "Selected machine type does not match request")
    booking_id = str(uuid4())
    estimate = round(float(machine["rate_per_acre"]) * payload.acres, 2) if machine else None
    with closing(connect()) as db:
        db.execute("""INSERT INTO bookings (id,farmer_name,farmer_phone,machine_id,machine_type,acres,booking_date,village,district,landmark,directions,latitude,longitude,estimated_total,status,source,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (booking_id,payload.farmer_name,payload.farmer_phone,payload.machine_id,payload.machine_type,payload.acres,payload.booking_date.isoformat(),payload.village,payload.district,payload.landmark,payload.directions,payload.latitude,payload.longitude,estimate,"requested","assistant" if payload.source == "assistant" else payload.source,datetime.utcnow().isoformat()))
        db.commit()
    return {"id": booking_id, "status": "requested", "estimated_total": estimate, "machine_assigned": bool(machine), "message": "Request created. Owner confirmation is still required."}


@app.get("/api/bookings")
def list_bookings(status: str | None = None):
    query = "SELECT * FROM bookings"; args=[]
    if status:
        query += " WHERE status=?"; args.append(status)
    query += " ORDER BY created_at DESC LIMIT 200"
    with closing(connect()) as db:
        return [dict(r) for r in db.execute(query,args).fetchall()]


@app.patch("/api/bookings/{booking_id}")
def update_booking(booking_id: str, status: Literal["accepted","rejected","completed","cancelled"], machine_id: str | None = None):
    with closing(connect()) as db:
        booking = db.execute("SELECT * FROM bookings WHERE id=?", (booking_id,)).fetchone()
        if booking is None: raise HTTPException(404,"Booking not found")
        if status == "accepted":
            chosen = machine_id or booking["machine_id"]
            if not chosen: raise HTTPException(422,"Select a machine before accepting")
            machine = db.execute("SELECT * FROM machines WHERE id=? AND available=1",(chosen,)).fetchone()
            if machine is None: raise HTTPException(404,"Machine not available")
            if machine["machine_type"].lower() != booking["machine_type"].lower(): raise HTTPException(422,"Machine type mismatch")
            estimate = round(machine["rate_per_acre"] * booking["acres"],2)
            db.execute("UPDATE bookings SET machine_id=?, estimated_total=?, status=? WHERE id=?",(chosen,estimate,status,booking_id))
        else:
            db.execute("UPDATE bookings SET status=? WHERE id=?",(status,booking_id))
        db.commit()
    return {"id":booking_id,"status":status}


@app.post("/api/assistant/message")
def assistant_message(payload: AssistantMessage):
    """Rules-based bilingual booking scaffold. Replace with STT/LLM/TTS services later."""
    s = dict(payload.session)
    msg = payload.message.strip()
    ta = payload.language == "ta"
    if not s.get("step"):
        s = {"step":"machine_type"}
    if s["step"] == "machine_type":
        s["machine_type"] = "Tractor" if any(x in msg.lower() for x in ["tractor","டிராக்டர்","ட்ராக்டர்"]) else ("Harvester" if any(x in msg.lower() for x in ["harvester","அறுவடை இயந்திரம்"]) else ("Rotavator" if "rotavator" in msg.lower() else None))
        s["step"] = "acres"
        reply = "எந்த இயந்திரம் வேண்டும்? டிராக்டர், ரோட்டவேட்டர் அல்லது அறுவடை இயந்திரமா?" if ta and not s["machine_type"] else ("எத்தனை ஏக்கர் நிலம்?" if ta else "How many acres do you need serviced?")
    elif s["step"] == "acres":
        import re
        match = re.search(r"\d+(?:\.\d+)?", msg)
        if match: s["acres"] = float(match.group())
        if not s.get("acres"):
            reply = "ஏக்கர் எண்ணிக்கையை சொல்லுங்கள்." if ta else "Please tell me the land size in acres."
        else:
            s["step"] = "date"
            reply = "எந்த தேதிக்கு வேண்டும்? (YYYY-MM-DD)" if ta else "What date do you need it? (YYYY-MM-DD)"
    elif s["step"] == "date":
        try:
            s["booking_date"] = date.fromisoformat(msg).isoformat(); s["step"]="village"
            reply = "உங்கள் கிராமம் மற்றும் மாவட்டம் என்ன?" if ta else "Which village and district is your farm in?"
        except ValueError:
            reply = "தேதியை YYYY-MM-DD வடிவில் சொல்லுங்கள்." if ta else "Please provide the date as YYYY-MM-DD."
    elif s["step"] == "village":
        s["village_and_district"] = msg; s["step"]="farmer_name"
        reply = "உங்கள் பெயர் மற்றும் தொலைபேசி எண்ணை சொல்லுங்கள்." if ta else "Please provide your name and phone number."
    elif s["step"] == "farmer_name":
        parts = [p.strip() for p in msg.split(",",1)]
        if len(parts) < 2:
            reply = "பெயர், தொலைபேசி எண் என்ற வரிசையில் சொல்லுங்கள்." if ta else "Please provide name, phone number separated by a comma."
        else:
            s["farmer_name"],s["farmer_phone"] = parts[0],parts[1]
            s["step"]="location"
            reply = "வயலுக்கு அருகிலுள்ள அடையாளம் அல்லது வழியை சொல்லுங்கள். GPS-ஐ பின்னர் பகிரலாம்." if ta else "Tell me a nearby landmark or directions. You can share GPS later."
    elif s["step"] == "location":
        s["directions"] = msg
        try:
            machine_type = s.get("machine_type") or "Tractor"
            village, district = [x.strip() for x in s["village_and_district"].split(",",1)]
            data = BookingCreate(farmer_name=s["farmer_name"],farmer_phone=s["farmer_phone"],machine_type=machine_type,acres=s["acres"],booking_date=s["booking_date"],village=village,district=district,directions=msg,source="assistant")
            result = create_booking(data)
            s["step"]="done"
            reply = (f"உங்கள் கோரிக்கை பதிவு செய்யப்பட்டது. குறியீடு {result['id'][:8]}. உரிமையாளர் உறுதிப்படுத்திய பிறகே பதிவு உறுதி." if ta else f"Your request is recorded. Reference {result['id'][:8]}. It is not confirmed until an owner accepts.")
            return {"reply":reply,"session":s,"booking":result}
        except Exception:
            reply = "கிராமம், மாவட்டம் ஆகியவற்றை கமாவுடன் தனித்தனியாக சொல்லுங்கள்." if ta else "Please provide village and district separated by a comma."
    else:
        reply = "புதிய கோரிக்கைக்கு மீண்டும் தொடங்கலாம்." if ta else "You can start a new request."
    return {"reply":reply,"session":s}

