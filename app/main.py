from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
from contextlib import closing
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
DB_PATH = ROOT / "vayal.db"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
USE_POSTGRES = bool(DATABASE_URL)
SESSION_COOKIE = "vayal_session"
SESSION_DAYS = 30
PASSWORD_ITERATIONS = 310_000

app = FastAPI(title="Vayal — Farm Machinery Marketplace", version="0.2.0")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


class HybridRow(dict):
    def __getitem__(self, key):
        return list(self.values())[key] if isinstance(key, int) else super().__getitem__(key)


class CursorResult:
    def __init__(self, cursor):
        self.cursor = cursor
        self.rowcount = cursor.rowcount

    @staticmethod
    def _row(row):
        return HybridRow(row) if row is not None else None

    def fetchone(self):
        return self._row(self.cursor.fetchone())

    def fetchall(self):
        return [self._row(row) for row in self.cursor.fetchall()]


class DatabaseConnection:
    def __init__(self, connection, postgres=False):
        self.connection = connection
        self.postgres = postgres

    def execute(self, sql, params=()):
        sql = sql.replace("?", "%s") if self.postgres else sql
        return CursorResult(self.connection.execute(sql, params))

    def executemany(self, sql, params):
        sql = sql.replace("?", "%s") if self.postgres else sql
        return self.connection.executemany(sql, params)

    def executescript(self, script):
        if self.postgres:
            for statement in script.split(";"):
                if statement.strip():
                    self.connection.execute(statement)
        else:
            self.connection.executescript(script)

    def commit(self):
        self.connection.commit()

    def close(self):
        self.connection.close()


def connect():
    if USE_POSTGRES:
        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:
            raise RuntimeError("PostgreSQL is configured but psycopg is missing.") from exc
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql+psycopg://"):
            url = "postgresql://" + url[len("postgresql+psycopg://"):]
        return DatabaseConnection(psycopg.connect(url, row_factory=dict_row, connect_timeout=10), postgres=True)
    if os.getenv("VERCEL") == "1":
        raise RuntimeError("DATABASE_URL must be configured in Vercel environment variables. SQLite is for local development only.")
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return DatabaseConnection(connection)


def init_db():
    if USE_POSTGRES:
        required = (
            "machines", "bookings", "vayal_users", "vayal_sessions",
            "vayal_machine_owners", "vayal_booking_farmers",
        )
        placeholders = ",".join("?" for _ in required)
        with closing(connect()) as db:
            row = db.execute(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema='public' AND table_name IN (" + placeholders + ")",
                required,
            ).fetchone()
            if row[0] != len(required):
                raise RuntimeError("Vayal PostgreSQL schema is incomplete. Apply the Vayal database migration before starting the app.")
        return

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
        CREATE TABLE IF NOT EXISTS vayal_users (
            id TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('farmer','machine_owner')),
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS vayal_sessions (
            token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES vayal_users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS vayal_machine_owners (
            machine_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
            FOREIGN KEY(machine_id) REFERENCES machines(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES vayal_users(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS vayal_booking_farmers (
            booking_id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
            FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES vayal_users(id) ON DELETE CASCADE
        );
        """)
        count = db.execute("SELECT COUNT(*) FROM machines").fetchone()[0]
        if count == 0:
            demo = [
                ("m1","Demo Owner A","9000000001","Tractor","Tractor + plough","Pollachi","Coimbatore","Demo listing",1500,1,"Illustrative listing; verify before use"),
                ("m2","Demo Owner B","9000000002","Rotavator","Tractor rotavator","Kinathukadavu","Coimbatore","Demo listing",1800,1,"Illustrative listing; verify before use"),
                ("m3","Demo Owner C","9000000003","Harvester","Paddy combine harvester","Udumalpet","Tiruppur","Demo listing",2500,1,"Illustrative listing; verify before use"),
            ]
            db.executemany("INSERT INTO machines VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING", demo)
        db.commit()


@app.on_event("startup")
def startup():
    init_db()


def normalize_phone(phone: str) -> str:
    return re.sub(r"[\\s()-]", "", phone.strip())


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    parts = [
        str(PASSWORD_ITERATIONS),
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    ]
    return "pbkdf2_sha256$" + "$".join(parts)


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, rounds, salt_text, digest_text = stored.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_session(db, user_id: str, response: Response):
    token = secrets.token_urlsafe(36)
    now = datetime.utcnow()
    expiry = now + timedelta(days=SESSION_DAYS)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.execute(
        "INSERT INTO vayal_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)",
        (token_hash,user_id,expiry.isoformat(),now.isoformat()),
    )
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE, value=token, httponly=True,
        secure=os.getenv("VERCEL") == "1", samesite="lax",
        max_age=SESSION_DAYS * 86400, path="/",
    )


def current_user(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Please sign in to continue.")
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with closing(connect()) as db:
        row = db.execute(
            """SELECT u.id,u.full_name,u.phone,u.role
               FROM vayal_sessions s JOIN vayal_users u ON u.id=s.user_id
               WHERE s.token_hash=? AND s.expires_at>?""",
            (digest,datetime.utcnow().isoformat()),
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")
    return dict(row)


def require_role(user: dict, role: str):
    if user["role"] != role:
        raise HTTPException(status_code=403, detail="This action is not available for your account type.")


class SignUpInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["farmer","machine_owner"]

    @model_validator(mode="after")
    def clean_phone(self):
        self.phone = normalize_phone(self.phone)
        if not re.fullmatch(r"\\+?[0-9]{8,15}", self.phone):
            raise ValueError("Enter a valid phone number.")
        return self


class SignInInput(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=1, max_length=128)
    role: Literal["farmer","machine_owner"]

    @model_validator(mode="after")
    def clean_phone(self):
        self.phone = normalize_phone(self.phone)
        return self


class MachineCreate(BaseModel):
    machine_type: Literal["Tractor","Rotavator","Harvester","Plough","Other"]
    title: str = Field(min_length=2, max_length=120)
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    landmark: str | None = Field(default=None, max_length=160)
    rate_per_acre: float = Field(ge=0, le=100000)
    description: str | None = Field(default=None, max_length=500)


class BookingCreate(BaseModel):
    machine_type: Literal["Tractor","Rotavator","Harvester","Plough","Other"]
    acres: float = Field(gt=0, le=10000)
    booking_date: date
    village: str = Field(min_length=2, max_length=100)
    district: str = Field(min_length=2, max_length=100)
    landmark: str | None = Field(default=None, max_length=160)
    directions: str | None = Field(default=None, max_length=1000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    machine_id: str | None = None

    @model_validator(mode="after")
    def gps_pair(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        return self


@app.get("/", response_class=HTMLResponse)
def home():
    return (ROOT / "static" / "index.html").read_text(encoding="utf-8")


@app.get("/api/health")
def health():
    with closing(connect()) as db:
        db.execute("SELECT 1")
    return {"status":"ok","service":"vayal","version":app.version,"database":"postgresql" if USE_POSTGRES else "sqlite","authentication":"enabled"}


@app.post("/api/auth/signup", status_code=201)
def sign_up(payload: SignUpInput, response: Response):
    user_id = str(uuid4())
    with closing(connect()) as db:
        if db.execute("SELECT id FROM vayal_users WHERE phone=?", (payload.phone,)).fetchone():
            raise HTTPException(status_code=409, detail="An account already exists for this phone number. Sign in instead.")
        db.execute(
            """INSERT INTO vayal_users (id,full_name,phone,password_hash,role,created_at)
               VALUES (?,?,?,?,?,?)""",
            (user_id,payload.full_name.strip(),payload.phone,hash_password(payload.password),payload.role,datetime.utcnow().isoformat()),
        )
        create_session(db,user_id,response)
    return {"user":{"id":user_id,"full_name":payload.full_name.strip(),"phone":payload.phone,"role":payload.role}}


@app.post("/api/auth/signin")
def sign_in(payload: SignInInput, response: Response):
    with closing(connect()) as db:
        user = db.execute("SELECT * FROM vayal_users WHERE phone=?", (payload.phone,)).fetchone()
        if user is None or not verify_password(payload.password,user["password_hash"]):
            raise HTTPException(status_code=401, detail="Phone number or password is incorrect.")
        if user["role"] != payload.role:
            raise HTTPException(status_code=403, detail="This phone number is registered under the other account type.")
        create_session(db,user["id"],response)
        return {"user":{"id":user["id"],"full_name":user["full_name"],"phone":user["phone"],"role":user["role"]}}


@app.get("/api/me")
def get_me(user: dict = Depends(current_user)):
    return {"user":user}


@app.post("/api/auth/signout")
def sign_out(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with closing(connect()) as db:
            db.execute("DELETE FROM vayal_sessions WHERE token_hash=?", (digest,))
            db.commit()
    response.delete_cookie(SESSION_COOKIE,path="/",httponly=True,samesite="lax")
    return {"ok":True}


@app.get("/api/machines")
def list_machines(district: str | None = None, machine_type: str | None = None):
    query = "SELECT * FROM machines WHERE available=1"
    args = []
    if district:
        query += " AND lower(district)=lower(?)"
        args.append(district)
    if machine_type:
        query += " AND lower(machine_type)=lower(?)"
        args.append(machine_type)
    query += " ORDER BY district,village"
    with closing(connect()) as db:
        return [dict(row) for row in db.execute(query,args).fetchall()]


@app.get("/api/my/machines")
def my_machines(user: dict = Depends(current_user)):
    require_role(user,"machine_owner")
    with closing(connect()) as db:
        rows = db.execute(
            """SELECT m.* FROM machines m JOIN vayal_machine_owners o ON o.machine_id=m.id
               WHERE o.user_id=? ORDER BY m.title""",
            (user["id"],),
        ).fetchall()
    return [dict(row) for row in rows]


@app.post("/api/machines", status_code=201)
def create_machine(payload: MachineCreate, user: dict = Depends(current_user)):
    require_role(user,"machine_owner")
    machine_id = str(uuid4())
    with closing(connect()) as db:
        db.execute(
            """INSERT INTO machines
               (id,owner_name,owner_phone,machine_type,title,village,district,landmark,rate_per_acre,available,description)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (machine_id,user["full_name"],user["phone"],payload.machine_type,payload.title.strip(),payload.village.strip(),payload.district.strip(),payload.landmark,payload.rate_per_acre,1,payload.description),
        )
        db.execute("INSERT INTO vayal_machine_owners (machine_id,user_id) VALUES (?,?)",(machine_id,user["id"]))
        db.commit()
    return {"id":machine_id,"message":"Machinery listing created."}


@app.patch("/api/machines/{machine_id}/availability")
def set_availability(machine_id: str, available: bool, user: dict = Depends(current_user)):
    require_role(user,"machine_owner")
    with closing(connect()) as db:
        owned = db.execute("SELECT machine_id FROM vayal_machine_owners WHERE machine_id=? AND user_id=?",(machine_id,user["id"])).fetchone()
        if owned is None:
            raise HTTPException(status_code=404,detail="Machinery not found in your listings.")
        db.execute("UPDATE machines SET available=? WHERE id=?",(int(available),machine_id))
        db.commit()
    return {"id":machine_id,"available":available}


@app.post("/api/bookings", status_code=201)
def create_booking(payload: BookingCreate, user: dict = Depends(current_user)):
    require_role(user,"farmer")
    machine = None
    if payload.machine_id:
        with closing(connect()) as db:
            machine = db.execute("SELECT * FROM machines WHERE id=? AND available=1",(payload.machine_id,)).fetchone()
        if machine is None:
            raise HTTPException(status_code=404,detail="Selected machine is not available.")
        if machine["machine_type"].lower() != payload.machine_type.lower():
            raise HTTPException(status_code=422,detail="Selected machine type does not match the request.")
    booking_id = str(uuid4())
    estimate = round(float(machine["rate_per_acre"])*payload.acres,2) if machine else None
    with closing(connect()) as db:
        db.execute(
            """INSERT INTO bookings
               (id,farmer_name,farmer_phone,machine_id,machine_type,acres,booking_date,village,district,landmark,directions,latitude,longitude,estimated_total,status,source,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (booking_id,user["full_name"],user["phone"],payload.machine_id,payload.machine_type,payload.acres,payload.booking_date.isoformat(),payload.village.strip(),payload.district.strip(),payload.landmark,payload.directions,payload.latitude,payload.longitude,estimate,"requested","app",datetime.utcnow().isoformat()),
        )
        db.execute("INSERT INTO vayal_booking_farmers (booking_id,user_id) VALUES (?,?)",(booking_id,user["id"]))
        db.commit()
    return {"id":booking_id,"status":"requested","estimated_total":estimate,"machine_assigned":bool(machine),"message":"Request submitted. It is confirmed only after a machine owner accepts."}


@app.get("/api/bookings")
def list_bookings(status: str | None = None, user: dict = Depends(current_user)):
    if user["role"] == "farmer":
        query = """SELECT b.* FROM bookings b JOIN vayal_booking_farmers f ON f.booking_id=b.id
                   WHERE f.user_id=?"""
    else:
        query = """SELECT DISTINCT b.* FROM bookings b WHERE EXISTS (
                   SELECT 1 FROM vayal_machine_owners o JOIN machines m ON m.id=o.machine_id
                   WHERE o.user_id=? AND (b.machine_id=m.id OR
                   (b.machine_id IS NULL AND lower(b.machine_type)=lower(m.machine_type)
                    AND lower(b.district)=lower(m.district))))"""
    args = [user["id"]]
    if status:
        query += " AND b.status=?"
        args.append(status)
    query += " ORDER BY b.created_at DESC LIMIT 200"
    with closing(connect()) as db:
        return [dict(row) for row in db.execute(query,args).fetchall()]


@app.patch("/api/bookings/{booking_id}")
def update_booking(
    booking_id: str,
    status: Literal["accepted","rejected","completed","cancelled"],
    machine_id: str | None = None,
    user: dict = Depends(current_user),
):
    with closing(connect()) as db:
        booking = db.execute("SELECT * FROM bookings WHERE id=?",(booking_id,)).fetchone()
        if booking is None:
            raise HTTPException(status_code=404,detail="Booking not found.")
        if user["role"] == "farmer":
            if status != "cancelled":
                raise HTTPException(status_code=403,detail="Farmers can only cancel their own pending requests.")
            own = db.execute("SELECT booking_id FROM vayal_booking_farmers WHERE booking_id=? AND user_id=?",(booking_id,user["id"])).fetchone()
            if own is None or booking["status"] != "requested":
                raise HTTPException(status_code=404,detail="Pending booking not found.")
            db.execute("UPDATE bookings SET status=? WHERE id=?",("cancelled",booking_id))
        else:
            require_role(user,"machine_owner")
            if status == "cancelled":
                raise HTTPException(status_code=403,detail="Machine owners cannot cancel a farmer's booking.")
            if status in ("accepted","rejected") and booking["status"] != "requested":
                raise HTTPException(status_code=409,detail="Only pending requests can be accepted or declined.")
            if status == "completed" and booking["status"] != "accepted":
                raise HTTPException(status_code=409,detail="Only accepted bookings can be marked completed.")
            chosen = machine_id or booking["machine_id"]
            if status == "accepted":
                if not chosen:
                    raise HTTPException(status_code=422,detail="Choose one of your matching machines before accepting.")
                machine = db.execute(
                    """SELECT m.* FROM machines m JOIN vayal_machine_owners o ON o.machine_id=m.id
                       WHERE m.id=? AND o.user_id=? AND m.available=1""",
                    (chosen,user["id"]),
                ).fetchone()
                if machine is None:
                    raise HTTPException(status_code=404,detail="That machine is not available in your listings.")
                if machine["machine_type"].lower() != booking["machine_type"].lower():
                    raise HTTPException(status_code=422,detail="Machine type does not match this booking.")
                if machine["district"].lower() != booking["district"].lower():
                    raise HTTPException(status_code=422,detail="Your machine must be in the farmer's district for this MVP.")
                estimate = round(float(machine["rate_per_acre"])*booking["acres"],2)
                db.execute("UPDATE bookings SET machine_id=?,estimated_total=?,status=? WHERE id=?",(chosen,estimate,"accepted",booking_id))
            else:
                allowed = db.execute(
                    """SELECT 1 FROM vayal_machine_owners o JOIN machines m ON m.id=o.machine_id
                       WHERE o.user_id=? AND (m.id=? OR
                       (lower(m.machine_type)=lower(?) AND lower(m.district)=lower(?))) LIMIT 1""",
                    (user["id"],booking["machine_id"],booking["machine_type"],booking["district"]),
                ).fetchone()
                if allowed is None:
                    raise HTTPException(status_code=404,detail="Booking not found in your service area.")
                db.execute("UPDATE bookings SET status=? WHERE id=?",(status,booking_id))
        db.commit()
    return {"id":booking_id,"status":status}


@app.get("/api/health/ready")
def readiness():
    return health()
