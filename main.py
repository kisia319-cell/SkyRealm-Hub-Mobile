"""SkyRealm account API: registration, email verification, and login."""
from __future__ import annotations
import hashlib, hmac, html, os, re, secrets, smtplib, threading, time, base64
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Generator, Optional
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

APP_VERSION = "0.2.0"
CODE_TTL_MINUTES = int(os.getenv("CODE_TTL_MINUTES", "10"))
CODE_RESEND_SECONDS = int(os.getenv("CODE_RESEND_SECONDS", "60"))
MAX_CODE_ATTEMPTS = int(os.getenv("MAX_CODE_ATTEMPTS", "5"))
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))
PBKDF2_ITERATIONS = 310_000

def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def normalize_database_url(value: str) -> str:
    if value.startswith("postgres://"):
        return "postgresql+psycopg://" + value[len("postgres://"):]
    if value.startswith("postgresql://"):
        return "postgresql+psycopg://" + value[len("postgresql://"):]
    return value

DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", "sqlite:///./skyrealm_auth.db"))
engine_args = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite:"):
    engine_args["connect_args"] = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    verification_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_salt: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verification_sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    verification_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

class AuthSession(Base):
    __tablename__ = "auth_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

Base.metadata.create_all(bind=engine)
app = FastAPI(title="SkyRealm Auth API", version=APP_VERSION, description="Registration, email confirmation and login for SkyRealm Launcher")
origins = [x.strip() for x in os.getenv("CORS_ALLOW_ORIGINS", "*").split(",") if x.strip()] or ["*"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["Authorization", "Content-Type"], max_age=600)

_rate_lock = threading.Lock()
_rate_events: dict[str, list[float]] = {}
_rate_calls = 0

def apply_rate_limit(request: Request, action: str, limit: int, seconds: int) -> None:
    global _rate_calls
    ip = request.client.host if request.client else "unknown"
    key, now = f"{action}:{ip}", time.monotonic()
    with _rate_lock:
        events = [stamp for stamp in _rate_events.get(key, []) if now - stamp < seconds]
        if len(events) >= limit:
            wait = max(1, int(seconds - (now - events[0])))
            raise HTTPException(429, detail={"code": "RATE_LIMITED", "message": f"Слишком много попыток. Попробуй снова примерно через {wait} сек."})
        events.append(now); _rate_events[key] = events; _rate_calls += 1
        if _rate_calls % 100 == 0:
            for old_key in list(_rate_events):
                fresh = [stamp for stamp in _rate_events[old_key] if now - stamp < 3600]
                if fresh: _rate_events[old_key] = fresh
                else: _rate_events.pop(old_key, None)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try: yield db
    finally: db.close()

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(PBKDF2_ITERATIONS, base64.urlsafe_b64encode(salt).decode().rstrip("="), base64.urlsafe_b64encode(digest).decode().rstrip("="))

def verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt_text, digest_text = stored.split("$", 3)
        if algo != "pbkdf2_sha256": return False
        salt = base64.urlsafe_b64decode(salt_text + "=" * (-len(salt_text) % 4))
        expected = base64.urlsafe_b64decode(digest_text + "=" * (-len(digest_text) % 4))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

def code_digest(code: str, salt: str) -> str:
    return hashlib.sha256((salt + ":" + code).encode()).hexdigest()

def send_verification_email(email: str, username: str, code: str) -> None:
    # Development-only mail adapter prints the code to the server console.
    if os.getenv("DEV_PRINT_EMAIL_CODE", "false").lower() == "true":
        print(f"[DEV ONLY] SkyRealm verification code for {email}: {code}", flush=True)
        return
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", user).strip()
    port = int(os.getenv("SMTP_PORT", "587"))
    if not (host and user and password and sender):
        raise RuntimeError("SMTP is not configured: SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM are required")
    safe_name = html.escape(username)
    message = EmailMessage()
    message["Subject"] = "Код подтверждения SkyRealm"
    message["From"] = sender
    message["To"] = email
    message.set_content(f"Привет, {username}!\n\nТвой код подтверждения SkyRealm: {code}\n\nКод действует {CODE_TTL_MINUTES} минут. Если ты не создавал аккаунт, проигнорируй это письмо.\nНе сообщай код другим людям.")
    message.add_alternative(f"""<!doctype html><html lang="ru"><body style="margin:0;background:#071020;color:#eaf0ff;font-family:Segoe UI,Arial,sans-serif;padding:30px"><div style="max-width:520px;margin:auto;padding:28px;background:#0d1b2e;border:1px solid #263b5d;border-radius:16px"><div style="color:#91aaff;font-size:12px;letter-spacing:3px;font-weight:bold">SKYREALM</div><h1 style="font-size:24px;margin:18px 0 8px">Подтверди свою почту</h1><p style="color:#b2c3e3;line-height:1.6">Привет, {safe_name}! Введи этот код в лаунчере SkyRealm:</p><div style="margin:24px 0;padding:18px;text-align:center;background:#071426;border:1px solid #4565aa;border-radius:12px;font-size:32px;letter-spacing:10px;font-weight:bold;color:#fff">{code}</div><p style="color:#9fb1d0;line-height:1.6">Код действует {CODE_TTL_MINUTES} минут. Не сообщай его другим людям. Если ты не создавал аккаунт, проигнорируй письмо.</p></div></body></html>""", subtype="html")
    use_starttls = os.getenv("SMTP_STARTTLS", "true").lower() == "true"
    timeout = int(os.getenv("SMTP_TIMEOUT_SECONDS", "15"))
    with smtplib.SMTP(host, port, timeout=timeout) as smtp:
        smtp.ehlo()
        if use_starttls:
            smtp.starttls(); smtp.ehlo()
        smtp.login(user, password)
        smtp.send_message(message)

def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"

def create_session(db: Session, user: User) -> str:
    raw_token = secrets.token_urlsafe(32)
    db.add(AuthSession(user_id=user.id, token_hash=hashlib.sha256(raw_token.encode()).hexdigest(), expires_at=utcnow() + timedelta(days=SESSION_TTL_DAYS)))
    db.commit()
    return raw_token

def public_user(user: User) -> dict:
    return {"id": user.id, "username": user.username, "email": user.email, "verified": bool(user.verified), "created_at": user.created_at.isoformat() + "Z"}

def current_user(authorization: Optional[str], db: Session) -> tuple[User, AuthSession]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, detail="Сначала войди в аккаунт.")
    raw_token = authorization[7:].strip()
    if not raw_token: raise HTTPException(401, detail="Сессия недействительна.")
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    session_row = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))
    if not session_row or session_row.expires_at <= utcnow():
        if session_row: db.delete(session_row); db.commit()
        raise HTTPException(401, detail="Сессия истекла. Войди снова.")
    user = db.get(User, session_row.user_id)
    if not user or not user.verified: raise HTTPException(401, detail="Аккаунт не подтверждён.")
    return user, session_row

class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    username: str = Field(min_length=3, max_length=20)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not re.fullmatch(r"[A-Za-zА-Яа-яЁё0-9_]{3,20}", value):
            raise ValueError("Имя игрока должно содержать 3–20 символов: буквы, цифры или подчёркивание.")
        return value.casefold()
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().casefold()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]{2,}", value): raise ValueError("Укажи корректный адрес электронной почты.")
        return value

class VerifyRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    code: str = Field(pattern=r"^\d{6}$")
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str: return value.strip().casefold()

class ResendRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str: return value.strip().casefold()

class LoginRequest(BaseModel):
    identifier: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)
    @field_validator("identifier")
    @classmethod
    def normalize_identifier(cls, value: str) -> str: return value.strip().casefold()

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "skyrealm-auth", "version": APP_VERSION}

@app.post("/api/auth/register", status_code=202)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    apply_rate_limit(request, "register", 5, 3600)
    existing = db.scalar(select(User).where((User.email == payload.email) | (User.username == payload.username)))
    if existing:
        raise HTTPException(409, detail={"code":"ACCOUNT_EXISTS", "message":"Этот адрес почты или имя игрока уже используется. Если аккаунт не подтверждён, открой проверку почты и запроси код повторно."})
    now, code, salt = utcnow(), generate_code(), secrets.token_hex(16)
    user = User(username=payload.username, email=payload.email, password_hash=hash_password(payload.password), verified=False,
                verification_hash=code_digest(code, salt), verification_salt=salt,
                verification_expires_at=now + timedelta(minutes=CODE_TTL_MINUTES), verification_sent_at=now,
                verification_attempts=0, created_at=now)
    db.add(user)
    try:
        db.commit(); db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(409, detail="Этот адрес почты или имя игрока уже используется.")
    try:
        send_verification_email(user.email, user.username, code)
    except Exception as exc:
        print(f"[SkyRealm Auth] Failed to send verification email: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(503, detail={"code":"EMAIL_SEND_FAILED", "message":"Аккаунт создан, но письмо отправить не удалось. Почтовый сервис ещё не настроен или временно недоступен; попробуй отправить код повторно позже.", "email":user.email})
    return {"message":f"Код подтверждения отправлен на {user.email}. Он действует {CODE_TTL_MINUTES} минут.", "email":user.email, "expires_in_seconds":CODE_TTL_MINUTES * 60}

@app.post("/api/auth/verify")
def verify_email(payload: VerifyRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    apply_rate_limit(request, "verify", 20, 300)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user: raise HTTPException(404, detail="Аккаунт для этой почты не найден. Зарегистрируйся ещё раз.")
    if user.verified:
        token = create_session(db, user)
        return {"message":"Почта уже подтверждена.", "access_token":token, "token_type":"bearer", "user":public_user(user)}
    if not user.verification_hash or not user.verification_salt or not user.verification_expires_at:
        raise HTTPException(400, detail="Код больше не действует. Запроси новый код.")
    if user.verification_expires_at <= utcnow():
        user.verification_hash = user.verification_salt = None
        user.verification_expires_at = None; user.verification_attempts = 0; db.commit()
        raise HTTPException(400, detail="Срок действия кода истёк. Нажми «Отправить код повторно».")
    if user.verification_attempts >= MAX_CODE_ATTEMPTS:
        user.verification_hash = user.verification_salt = None
        user.verification_expires_at = None; db.commit()
        raise HTTPException(429, detail="Слишком много неверных кодов. Запроси новый код и попробуй снова.")
    if not hmac.compare_digest(user.verification_hash, code_digest(payload.code, user.verification_salt)):
        user.verification_attempts += 1; db.commit()
        remaining = max(0, MAX_CODE_ATTEMPTS - user.verification_attempts)
        raise HTTPException(400, detail=f"Код неверный. Осталось попыток: {remaining}.")
    user.verified = True
    user.verification_hash = user.verification_salt = None
    user.verification_expires_at = user.verification_sent_at = None
    user.verification_attempts = 0
    db.commit()
    token = create_session(db, user)
    return {"message":"Почта успешно подтверждена.", "access_token":token, "token_type":"bearer", "user":public_user(user)}

@app.post("/api/auth/resend")
def resend_code(payload: ResendRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    apply_rate_limit(request, "resend", 8, 3600)
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or user.verified:
        return {"message":"Если аккаунт существует и ожидает подтверждения, письмо с кодом будет отправлено."}
    now = utcnow()
    if user.verification_sent_at and (now - user.verification_sent_at).total_seconds() < CODE_RESEND_SECONDS:
        wait = CODE_RESEND_SECONDS - int((now - user.verification_sent_at).total_seconds())
        raise HTTPException(429, detail=f"Подожди ещё {max(1, wait)} сек. перед повторной отправкой кода.")
    code, salt = generate_code(), secrets.token_hex(16)
    user.verification_hash, user.verification_salt = code_digest(code, salt), salt
    user.verification_expires_at = now + timedelta(minutes=CODE_TTL_MINUTES)
    user.verification_sent_at = now; user.verification_attempts = 0; db.commit()
    try:
        send_verification_email(user.email, user.username, code)
    except Exception as exc:
        print(f"[SkyRealm Auth] Failed to resend verification email: {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(503, detail="Не удалось отправить письмо. Почтовый сервис сервера не настроен или временно недоступен.")
    return {"message":"Новый код отправлен. Проверь входящие письма и папку «Спам»."}

@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    apply_rate_limit(request, "login", 10, 300)
    if "@" in payload.identifier: user = db.scalar(select(User).where(User.email == payload.identifier))
    else: user = db.scalar(select(User).where(User.username == payload.identifier))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail="Неверный логин, почта или пароль.")
    if not user.verified:
        raise HTTPException(403, detail={"code":"EMAIL_NOT_VERIFIED", "message":"Сначала подтверди почту. Код можно запросить на экране подтверждения.", "email":user.email})
    token = create_session(db, user)
    return {"access_token":token, "token_type":"bearer", "expires_in_seconds":SESSION_TTL_DAYS * 86400, "user":public_user(user)}

@app.get("/api/auth/me")
def me(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)) -> dict:
    user, _ = current_user(authorization, db)
    return {"user":public_user(user)}

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None), db: Session = Depends(get_db)) -> dict:
    _, session_row = current_user(authorization, db)
    db.delete(session_row); db.commit()
    return {"message":"Выполнен выход из аккаунта."}
