#!/usr/bin/env python3
"""
Agentic OS — FastAPI Backend
Multi-agent orchestration server for opencode, Hermes, Gemini CLI
"""
import argparse
import json
import os
import re
import shutil
import ssl
import subprocess
import tarfile
import time
import uuid
import http.client
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Generator

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

_scheduler_instance = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_instance
    try:
        from scheduler.scheduler import CronScheduler
        _scheduler_instance = CronScheduler()
        _scheduler_instance.start()
        print("Event-driven scheduler started")
    except Exception as e:
        print(f"Scheduler not available: {e}")
    yield
    if _scheduler_instance:
        try:
            _scheduler_instance.stop()
        except Exception:
            pass

app = FastAPI(title="Agentic OS", version="1.1.0", lifespan=lifespan)

# Load OpenRouter API key from Hermes .env
HERMES_ENV = Path.home() / ".hermes" / ".env"
if HERMES_ENV.exists():
    for line in HERMES_ENV.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if k == "OPENROUTER_API_KEY":
                os.environ[k] = v  # last value wins (matches shell sourcing)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8080", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.resolve()

# ─── Models ───────────────────────────────────────────────────────

class BrainUpdate(BaseModel):
    content: str

class SkillRunRequest(BaseModel):
    input: Optional[str] = ""
    agent: Optional[str] = "auto"

class ScheduleJobRequest(BaseModel):
    name: str
    skill: str
    cron: str
    enabled: bool = True

class SettingsUpdate(BaseModel):
    settings: dict

class BackupRestoreRequest(BaseModel):
    file: str

class ChatRequest(BaseModel):
    agent: str
    message: str

# ─── Helper Functions ─────────────────────────────────────────────

def read_file(path: Path):
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")

def write_file(path: Path, content: str):
    path.write_text(content, encoding="utf-8")
    return True

def list_dir(path: Path):
    if not path.exists():
        return []
    return sorted([p.name for p in path.iterdir() if not p.name.startswith(".")])

def get_timestamp():
    return datetime.now(timezone.utc).isoformat()

def append_audit(entry: dict):
    audit_file = BASE_DIR / "audit" / "audit.log"
    entry["timestamp"] = get_timestamp()
    entry["id"] = str(uuid.uuid4())[:8]
    with open(audit_file, "a") as f:
        f.write(json.dumps(entry) + "\n")

def safe_resolve(base: Path, user_path: str) -> Path:
    """Resolve a user-supplied path relative to base, preventing traversal."""
    resolved = (base / user_path).resolve()
    if not str(resolved).startswith(str(base.resolve())):
        raise HTTPException(400, "Invalid path")
    return resolved

def safe_extractall(tar: tarfile.TarFile, path: Path):
    """Extract tar archive with path traversal protection."""
    for member in tar.getmembers():
        member_path = (path / member.name).resolve()
        if not str(member_path).startswith(str(path.resolve())):
            raise HTTPException(400, f"Blocked path traversal: {member.name}")
    tar.extractall(path=path)

# ─── Security Headers Middleware ─────────────────────────────────

class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = message.get("headers", [])
                extra = [
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                ]
                # Only add CSP for non-API routes (dashboard HTML)
                path = scope.get("path", "")
                if not path.startswith("/api/"):
                    csp = (
                        b"default-src 'self'; "
                        b"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                        b"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                        b"font-src 'self' https://fonts.gstatic.com; "
                        b"img-src 'self' data:; "
                        b"connect-src 'self' http://127.0.0.1:* http://localhost:*; "
                        b"frame-ancestors 'none'"
                    )
                    extra.append((b"content-security-policy", csp))
                message["headers"] = list(headers) + extra
            await send(message)

        await self.app(scope, receive, send_with_headers)

app.add_middleware(SecurityHeadersMiddleware)

# ─── LLM API Integration ──────────────────────────────────────────

DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

def _load_settings() -> dict:
    sf = BASE_DIR / "data" / "settings.json"
    if sf.exists():
        return json.loads(sf.read_text())
    return {}

def call_deepseek(messages: list, model: str = "deepseek-v4-pro", max_tokens: int = 4096) -> str:
    settings = _load_settings()
    api_key = settings.get("api_keys", {}).get("deepseek", "")
    if not api_key:
        return "⚠ DeepSeek API key not configured. Add it in Settings."
    body = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }).encode("utf-8")
    req = urllib.request.Request(DEEPSEEK_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    })
    try:
        with urllib.request.urlopen(req, timeout=120, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")[:500]
        return f"⚠ DeepSeek API error ({e.code}): {err_body}"
    except Exception as e:
        return f"⚠ DeepSeek API error: {str(e)}"

def call_openrouter(messages: list, model: str = "deepseek/deepseek-chat", max_tokens: int = 4096) -> str:
    settings = _load_settings()
    api_key = settings.get("api_keys", {}).get("openrouter", "")
    if not api_key:
        return "⚠ OpenRouter API key not configured. Add it in Settings."
    body = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }).encode("utf-8")
    req = urllib.request.Request(OPENROUTER_URL, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://127.0.0.1:8080",
        "X-Title": "Agentic OS",
    })
    try:
        with urllib.request.urlopen(req, timeout=120, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")[:500]
        return f"⚠ OpenRouter API error ({e.code}): {err_body}"
    except Exception as e:
        return f"⚠ OpenRouter API error: {str(e)}"

def call_gemini(messages: list, model: str = "gemini-2.5-pro", max_tokens: int = 4096) -> str:
    settings = _load_settings()
    api_key = settings.get("api_keys", {}).get("gemini", "")
    if not api_key:
        return "⚠ Gemini API key not configured. Add it in Settings."
    system_instruction = ""
    contents = []
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            system_instruction = content
        else:
            parts = [{"text": content}]
            if role == "assistant":
                contents.append({"role": "model", "parts": parts})
            else:
                contents.append({"role": "user", "parts": parts})
    body = json.dumps({
        "contents": contents,
        "systemInstruction": {"parts": [{"text": system_instruction}]} if system_instruction else None,
        "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.7},
    }, default=lambda x: None if x is None else x).encode("utf-8")
    # Remove null systemInstruction if not present
    body_dict = json.loads(body.decode("utf-8"))
    if body_dict.get("systemInstruction") is None:
        del body_dict["systemInstruction"]
    body = json.dumps(body_dict).encode("utf-8")

    url = GEMINI_URL.replace("{model}", model) + f"?key={api_key}"
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120, context=SSL_CONTEXT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")[:500]
        return f"⚠ Gemini API error ({e.code}): {err_body}"
    except Exception as e:
        return f"⚠ Gemini API error: {str(e)}"

def call_llm(messages: list, provider: str = "deepseek", model: str = None) -> str:
    settings = _load_settings()
    llm_config = settings.get("llm", {})
    if not provider or provider == "default":
        provider = llm_config.get("default_provider", "deepseek")

    if provider == "deepseek":
        m = model or llm_config.get("deepseek_model", "deepseek-v4-pro")
        return call_deepseek(messages, model=m)
    elif provider == "openrouter":
        m = model or llm_config.get("openrouter_model", "deepseek/deepseek-chat")
        return call_openrouter(messages, model=m)
    elif provider == "gemini":
        m = model or llm_config.get("gemini_model", "gemini-2.5-pro")
        return call_gemini(messages, model=m)
    else:
        return f"⚠ Unknown provider: {provider}"

# ─── Streaming LLM API ─────────────────────────────────────────────

def _parse_sse_chunk(data: str) -> str:
    """Parse SSE data line from DeepSeek/OpenRouter streaming response."""
    for line in data.split('\n'):
        line = line.strip()
        if line.startswith('data: '):
            content = line[6:]
            if content == '[DONE]':
                return None
            try:
                obj = json.loads(content)
                return obj.get("choices", [{}])[0].get("delta", {}).get("content", "")
            except:
                return None
    return None

def stream_deepseek(messages: list, model: str = "deepseek-v4-pro") -> Generator[str, None, None]:
    settings = _load_settings()
    api_key = settings.get("api_keys", {}).get("deepseek", "")
    if not api_key:
        yield "⚠ DeepSeek API key not configured."
        return
    body = json.dumps({"model": model, "messages": messages, "max_tokens": 4096, "temperature": 0.7, "stream": True}).encode("utf-8")
    try:
        conn = http.client.HTTPSConnection("api.deepseek.com", context=SSL_CONTEXT, timeout=120)
        conn.request("POST", "/v1/chat/completions", body=body, headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {api_key}"})
        resp = conn.getresponse()
        buffer = b""
        while True:
            chunk = resp.read(1024)
            if not chunk:
                break
            buffer += chunk
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                text = _parse_sse_chunk(line.decode("utf-8", errors="ignore"))
                if text:
                    yield text
        conn.close()
    except Exception as e:
        yield f"\n⚠ Stream error: {str(e)}"

def stream_openrouter(messages: list, model: str = "deepseek/deepseek-chat") -> Generator[str, None, None]:
    settings = _load_settings()
    api_key = settings.get("api_keys", {}).get("openrouter", "")
    if not api_key:
        yield "⚠ OpenRouter API key not configured."
        return
    body = json.dumps({"model": model, "messages": messages, "max_tokens": 4096, "temperature": 0.7, "stream": True}).encode("utf-8")
    try:
        conn = http.client.HTTPSConnection("openrouter.ai", context=SSL_CONTEXT, timeout=120)
        conn.request("POST", "/api/v1/chat/completions", body=body, headers={
            "Content-Type": "application/json", "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://127.0.0.1:8080", "X-Title": "Agentic OS"})
        resp = conn.getresponse()
        buffer = b""
        while True:
            chunk = resp.read(1024)
            if not chunk:
                break
            buffer += chunk
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                text = _parse_sse_chunk(line.decode("utf-8", errors="ignore"))
                if text:
                    yield text
        conn.close()
    except Exception as e:
        yield f"\n⚠ Stream error: {str(e)}"

def stream_gemini_chunks(text: str) -> Generator[str, None, None]:
    """Simulate streaming for Gemini by yielding text word by word."""
    words = text.split()
    for i, w in enumerate(words):
        yield w + (" " if i < len(words) - 1 else "")

# ─── Agent Discovery (instant filesystem checks) ────────────────────

def check_agent(name: str) -> dict:
    """Instant filesystem-based check. No subprocess needed."""
    try:
        # Also check nvm Node.js bin paths (server may not have user's PATH)
        extra_paths = []
        nvm_bin = Path.home() / ".nvm" / "versions"
        if nvm_bin.exists():
            for ver_dir in nvm_bin.iterdir():
                extra_paths.append(str(ver_dir / "bin"))

        def find_bin(bin_name):
            found = shutil.which(bin_name)
            if found:
                return found
            # Search extra paths
            for p in extra_paths:
                candidate = Path(p) / bin_name
                if candidate.exists():
                    return str(candidate)
            return None

        if name == "opencode":
            exists = find_bin("opencode") is not None
            status = "online" if exists else "offline"
        elif name == "hermes":
            exists = find_bin("hermes") is not None
            status = "online" if exists else "offline"
        elif name == "gemini":
            # Gemini uses Google OAuth
            exists = find_bin("gemini") is not None
            oauth = Path.home() / ".gemini" / "oauth_creds.json"
            logged_in = oauth.exists() and "ya29" in oauth.read_text()
            status = "online" if exists and logged_in else "offline" if not exists else "warning"
        elif name == "jcode":
            exists = find_bin("node") is not None
            status = "online" if exists else "offline"
        else:
            status = "offline"
    except Exception:
        status = "offline"
    return {"name": name, "status": status}

# ─── Routes: Status ───────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    agents = [check_agent(a) for a in ["opencode", "hermes", "gemini", "jcode"]]
    skills = list_dir(BASE_DIR / "skills")
    return {
        "status": "healthy",
        "agents": agents,
        "skills_count": len(skills),
        "uptime": time.time(),
    }

# ─── Routes: Brain ────────────────────────────────────────────────

@app.get("/api/brain")
def list_brain():
    brain_dir = BASE_DIR / "brain"
    if not brain_dir.exists():
        return {}
    files = sorted([p.name for p in brain_dir.iterdir() if p.name.endswith(".md") and p.is_file()])
    brain_data = {}
    for f in files:
        path = brain_dir / f
        brain_data[f] = read_file(path)
    return brain_data

@app.get("/api/brain/{file_name}")
def get_brain_file(file_name: str):
    if ".." in file_name or "/" in file_name:
        raise HTTPException(400, "Invalid file name")
    path = BASE_DIR / "brain" / file_name
    if not path.exists() or path.is_dir():
        raise HTTPException(404, "File not found")
    return {"name": file_name, "content": read_file(path)}

@app.put("/api/brain/{file_name}")
def update_brain_file(file_name: str, data: BrainUpdate):
    if ".." in file_name or "/" in file_name:
        raise HTTPException(400, "Invalid file name")
    path = BASE_DIR / "brain" / file_name
    write_file(path, data.content)
    append_audit({"action": "brain_update", "file": file_name})
    return {"status": "ok", "file": file_name}

# ─── Routes: Skills ───────────────────────────────────────────────

@app.get("/api/skills")
def list_skills():
    skills = []
    for d in sorted((BASE_DIR / "skills").iterdir()):
        if d.is_dir() and not d.name.startswith("_"):
            skill_md = read_file(d / "SKILL.md")
            learnings = read_file(d / "learnings.md")
            eval_data = {}
            eval_path = d / "eval.json"
            if eval_path.exists():
                eval_data = json.loads(eval_path.read_text())
            score_history = []
            score_path = d / "score-history.json"
            if score_path.exists():
                score_history = json.loads(score_path.read_text())
            skills.append({
                "name": d.name,
                "description": skill_md[:200] if skill_md else "",
                "has_learnings": bool(learnings),
                "eval_criteria": eval_data.get("criteria", []),
                "scores": score_history,
            })
    return skills

@app.get("/api/skills/{name}")
def get_skill(name: str):
    if ".." in name or "/" in name:
        raise HTTPException(400, "Invalid skill name")
    path = BASE_DIR / "skills" / name
    if not path.exists():
        raise HTTPException(404, "Skill not found")
    return {
        "name": name,
        "skill": read_file(path / "SKILL.md"),
        "learnings": read_file(path / "learnings.md"),
        "eval": json.loads((path / "eval.json").read_text()) if (path / "eval.json").exists() else {},
        "score_history": json.loads((path / "score-history.json").read_text()) if (path / "score-history.json").exists() else [],
        "context": [f.name for f in (path / "context").iterdir()] if (path / "context").exists() else [],
    }

@app.post("/api/skills/{name}/run")
def run_skill(name: str, req: Optional[SkillRunRequest] = None):
    if ".." in name or "/" in name:
        raise HTTPException(400, "Invalid skill name")
    path = BASE_DIR / "skills" / name
    if not path.exists():
        raise HTTPException(404, "Skill not found")

    agent_choice = req.agent if req else "auto"
    skill_input = req.input if req else ""

    # ── Landing Builder: special handler using LLM API ──
    if name == "landing-builder" and skill_input:
        try:
            params = {}
            for part in skill_input.split():
                if "=" in part:
                    k, v = part.split("=", 1)
                    params[k] = v
            source_url = params.get("source_url", "")
            product_url = params.get("product_url", "")
            lang = params.get("language", "български")

            source_html = ""
            product_html = ""
            if source_url:
                try:
                    s_req = urllib.request.Request(source_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(s_req, timeout=30, context=SSL_CONTEXT) as resp:
                        source_html = resp.read().decode("utf-8", errors="ignore")[:8000]
                except Exception as e:
                    source_html = f"Could not fetch: {e}"
            if product_url:
                try:
                    p_req = urllib.request.Request(product_url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(p_req, timeout=30, context=SSL_CONTEXT) as resp:
                        product_html = resp.read().decode("utf-8", errors="ignore")[:12000]
                except Exception as e:
                    product_html = f"Could not fetch: {e}"

            prompt = f"""Ти си експерт по уеб дизайн и лендинг страници.

ЗАДАЧА: Създай пълна HTML лендинг страница на {lang} език.

РЕФЕРЕНТЕН ДИЗАЙН (от {source_url}):
{source_html[:5000]}

ПРОДУКТОВА ИНФОРМАЦИЯ (от {product_url}):
{product_html[:6000]}

ИЗИСКВАНИЯ:
1. Вземи дизайна, цветовете, шрифтовете и структурата от референтната страница
2. Замени съдържанието с информация за продукта от продуктовата страница
3. Използвай вграден CSS (inline или <style> таг)
4. Направи я responsive (mobile-friendly)
5. Добави: hero секция, features, CTA бутони, footer
6. НЕ използвай markdown - върни САМО чист HTML код между ```html и ``` маркери

Генерирай пълната лендинг страница сега:"""

            messages = [{"role": "user", "content": prompt}]
            response_text = call_llm(messages)

            # Extract HTML from response
            html_match = re.search(r'```html\s*(.*?)```', response_text, re.DOTALL)
            if html_match:
                landing_html = html_match.group(1).strip()
            else:
                landing_html = response_text.strip().replace("```html", "").replace("```", "")

            # Save to skills context folder
            output_path = path / "context" / "landing.html"
            output_path.write_text(landing_html, encoding="utf-8")

            append_audit({
                "action": "skill_run",
                "skill": name,
                "agent": "llm",
                "run_id": str(uuid.uuid4())[:8],
                "output_preview": "Landing page generated",
            })

            return {
                "status": "completed",
                "skill": name,
                "agent": "llm",
                "output": f"✅ Лендинг страницата е готова!\n\n📁 Запазена в: skills/landing-builder/context/landing.html\n📏 Размер: {len(landing_html)} символа\n📄 Преглед на първите 300 символа:\n{landing_html[:300]}...",
                "message": "Готово! Отвори landing.html в браузър",
                "preview": landing_html[:500],
            }
        except Exception as e:
            log_error("skill", f"Landing builder failed: {str(e)}", "skill")
            return {"status": "error", "skill": name, "output": f"⚠ Грешка: {str(e)}"}

    # Read skill files
    skill_md = read_file(path / "SKILL.md")
    learnings = read_file(path / "learnings.md")

    # ── Special handlers for skills with specific logic ──
    if name == "backup-skill":
        backup_dir = BASE_DIR / "backups"
        backup_dir.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"agentic-os-{ts}.tar.gz"
        with tarfile.open(backup_file, "w:gz") as tar:
            for dn in ["brain", "skills", "agents", "registry", "standards", "prompts"]:
                d = BASE_DIR / dn
                if d.exists():
                    tar.add(d, arcname=dn)
        append_audit({"action": "skill_run", "skill": name, "agent": "system"})
        return {"status": "completed", "skill": name, "agent": "system",
                "output": f"✅ Бекъп създаден: {backup_file.name} ({backup_file.stat().st_size} bytes)",
                "message": f"Backup created: {backup_file.name}"}

    if name == "heartbeat":
        agents = [check_agent(a) for a in ["opencode", "hermes", "gemini", "jcode"]]
        online = [a["name"] for a in agents if a["status"] == "online"]
        append_audit({"action": "skill_run", "skill": name, "agent": "system"})
        return {"status": "completed", "skill": name, "agent": "system",
                "output": f"💓 Heartbeat OK\n🟢 Online agents: {', '.join(online) if online else 'none'}\n🔴 Offline: {len(agents)-len(online)}\n🕐 {get_timestamp()[:19]}",
                "message": "Heartbeat check complete"}

    if name == "devops-audit":
        import platform, os as os_mod
        info = f"System: {platform.system()} {platform.release()}\nPython: {platform.python_version()}\nCWD: {os.getcwd()}\nDisk: {shutil.disk_usage('/').free // (1024**3)}GB free"
        append_audit({"action": "skill_run", "skill": name, "agent": "system"})
        return {"status": "completed", "skill": name, "agent": "system",
                "output": f"🔍 DevOps Audit\n{info}", "message": "Audit complete"}

    if name == "cost-analytics":
        cf = BASE_DIR / "data" / "cost-history.json"
        entries = json.loads(cf.read_text())["entries"] if cf.exists() else []
        total = sum(e.get("cost", 0) for e in entries)
        append_audit({"action": "skill_run", "skill": name, "agent": "system"})
        return {"status": "completed", "skill": name, "agent": "system",
                "output": f"💰 Cost Analytics\nTotal entries: {len(entries)}\nTotal cost: ${total:.4f}\nLast 5: ...",
                "message": f"{len(entries)} cost entries analyzed"}

    # ── Generic execution via LLM API for all other skills ──
    run_id = str(uuid.uuid4())[:8]

    system_prompt = f"""You are executing the '{name}' skill in Agentic OS.

SKILL INSTRUCTIONS:
{skill_md}

PAST LEARNINGS:
{learnings if learnings else '(none)'}

Execute the task below following the skill instructions exactly. Be thorough and practical."""

    user_prompt = skill_input if skill_input else f"Execute the {name} skill with default parameters."

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        response_text = call_llm(messages)
        agent_used = "llm"
    except Exception as e:
        response_text = f"⚠ LLM execution failed: {str(e)}"
        agent_used = "llm-error"

    # Save learnings
    timestamp = get_timestamp()[:10]
    existing = read_file(path / "learnings.md")
    new_entry = f"\n## {timestamp} (Run {run_id})\n- Agent: {agent_used}\n- Input: {skill_input or '(none)'}\n- Output: {response_text[:500]}\n"
    write_file(path / "learnings.md", existing + new_entry)

    append_audit({"action": "skill_run", "skill": name, "agent": agent_used, "run_id": run_id,
                  "output_preview": response_text[:100]})

    return {
        "status": "completed",
        "run_id": run_id,
        "skill": name,
        "agent": agent_used,
        "output": response_text,
        "message": f"Skill '{name}' completed via {agent_used}",
    }

@app.get("/api/skills/{name}/eval")
def get_skill_eval(name: str):
    if ".." in name or "/" in name:
        raise HTTPException(400, "Invalid skill name")
    path = BASE_DIR / "skills" / name / "score-history.json"
    if not path.exists():
        return {"scores": []}
    return {"scores": json.loads(path.read_text())}

# ─── Routes: Scheduler ────────────────────────────────────────────

@app.get("/api/scheduler/jobs")
def list_jobs():
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs = []
    for f in sorted(jobs_dir.glob("*.json")):
        jobs.append(json.loads(f.read_text()))
    return jobs

@app.post("/api/scheduler/jobs")
def create_job(job: ScheduleJobRequest):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    job_data = {
        "id": str(uuid.uuid4())[:8],
        "name": job.name,
        "skill": job.skill,
        "cron": job.cron,
        "enabled": job.enabled,
        "created": get_timestamp(),
        "last_run": None,
        "next_run": None,
    }
    (jobs_dir / f"{job.name.replace(' ', '_')}.json").write_text(
        json.dumps(job_data, indent=2)
    )
    append_audit({"action": "job_created", "job": job.name})
    return job_data

@app.delete("/api/scheduler/jobs/{job_id}")
def delete_job(job_id: str):
    jobs_dir = BASE_DIR / "scheduler" / "jobs"
    for f in jobs_dir.glob("*.json"):
        data = json.loads(f.read_text())
        if data.get("id") == job_id:
            f.unlink()
            append_audit({"action": "job_deleted", "job_id": job_id})
            return {"status": "deleted"}
    raise HTTPException(404, "Job not found")

# ─── Routes: Audit ────────────────────────────────────────────────

@app.get("/api/audit")
def get_audit(limit: int = Query(100, le=500)):
    audit_file = BASE_DIR / "audit" / "audit.log"
    if not audit_file.exists():
        return {"entries": []}
    lines = audit_file.read_text().strip().split("\n")
    entries = [json.loads(l) for l in lines if l.strip()]
    return {"entries": entries[-limit:]}

# ─── Routes: Cost Analytics ───────────────────────────────────────

@app.get("/api/cost")
def get_cost():
    cost_file = BASE_DIR / "data" / "cost-history.json"
    if not cost_file.exists():
        return {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    return json.loads(cost_file.read_text())

@app.post("/api/cost/record")
def record_cost(data: dict):
    cost_file = BASE_DIR / "data" / "cost-history.json"
    cost_data = json.loads(cost_file.read_text()) if cost_file.exists() else \
        {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []}
    cost_data["entries"].append({
        "timestamp": get_timestamp(),
        "agent": data.get("agent", "unknown"),
        "tokens": data.get("tokens", 0),
        "cost": data.get("cost", 0.0),
        "model": data.get("model", "unknown"),
    })
    cost_file.write_text(json.dumps(cost_data, indent=2))
    return {"status": "recorded"}

# ─── Routes: Registry/Plugins ─────────────────────────────────────

@app.get("/api/plugins")
def list_plugins():
    reg_file = BASE_DIR / "registry" / "plugins.json"
    if not reg_file.exists():
        return {"plugins": []}
    return json.loads(reg_file.read_text())

@app.post("/api/plugins/install")
def install_plugin(data: dict):
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Plugin name required")
    reg_file = BASE_DIR / "registry" / "plugins.json"
    reg = json.loads(reg_file.read_text()) if reg_file.exists() else {"plugins": []}
    if any(p["name"] == name for p in reg["plugins"]):
        return {"status": "already_installed"}
    reg["plugins"].append({
        "name": name,
        "installed": get_timestamp(),
        "version": "1.0.0",
    })
    reg_file.write_text(json.dumps(reg, indent=2))
    append_audit({"action": "plugin_installed", "plugin": name})
    return {"status": "installed", "plugin": name}

# ─── Routes: Backup ───────────────────────────────────────────────

@app.get("/api/backups")
def list_backups():
    backup_dir = BASE_DIR / "backups"
    backups = []
    for f in sorted(backup_dir.glob("*.tar.gz"), reverse=True):
        backups.append({
            "name": f.name,
            "size": f.stat().st_size,
            "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        })
    return backups

@app.post("/api/backup")
def create_backup():
    backup_dir = BASE_DIR / "backups"
    backup_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"agentic-os-{ts}.tar.gz"
    with tarfile.open(backup_file, "w:gz") as tar:
        for dir_name in ["brain", "skills", "agents", "registry", "standards", "prompts"]:
            d = BASE_DIR / dir_name
            if d.exists():
                tar.add(d, arcname=dir_name)
    append_audit({"action": "backup_created", "file": backup_file.name})
    return {"status": "ok", "file": backup_file.name, "size": backup_file.stat().st_size}

@app.post("/api/backup/restore")
def restore_backup(data: BackupRestoreRequest):
    if ".." in data.file or "/" in data.file:
        raise HTTPException(400, "Invalid backup file")
    backup_file = BASE_DIR / "backups" / data.file
    if not backup_file.exists():
        raise HTTPException(404, "Backup file not found")
    with tarfile.open(backup_file, "r:gz") as tar:
        safe_extractall(tar, BASE_DIR)
    append_audit({"action": "backup_restored", "file": data.file})
    return {"status": "restored"}

# ─── Routes: Prompts ──────────────────────────────────────────────

@app.get("/api/prompts")
def list_prompts():
    prompts_dir = BASE_DIR / "prompts"
    prompts = {}
    for f in sorted(prompts_dir.glob("*.md")):
        prompts[f.stem] = read_file(f)
    return prompts

# ─── Routes: Settings ─────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    sf = BASE_DIR / "data" / "settings.json"
    if not sf.exists():
        return {}
    data = json.loads(sf.read_text())
    # Mask sensitive values
    if "api_keys" in data:
        data["api_keys"] = {k: v[:4] + "****" if len(v) > 8 else "****" for k, v in data["api_keys"].items()}
    if "github" in data and "token" in data["github"]:
        data["github"]["token"] = data["github"]["token"][:4] + "****"
    return data

@app.put("/api/settings")
def update_settings(data: SettingsUpdate):
    sf = BASE_DIR / "data" / "settings.json"
    # Merge with existing
    existing = json.loads(sf.read_text()) if sf.exists() else {}
    existing.update(data.settings)
    sf.write_text(json.dumps(existing, indent=2))
    append_audit({"action": "settings_updated"})
    return {"status": "ok"}


# ═══════════════════════════════════════════════════════════════════
# GitHub Integration
# ═══════════════════════════════════════════════════════════════════

def _get_github_credentials():
    settings = _load_json(BASE_DIR / "data" / "settings.json", {})
    gh = settings.get("github", {})
    return gh.get("username", ""), gh.get("token", "")

def _github_api(path: str, method: str = "GET", body: dict = None) -> dict:
    """Call GitHub REST API."""
    username, token = _get_github_credentials()
    if not token:
        raise HTTPException(400, "GitHub token not configured. Add it in Settings.")
    url = f"https://api.github.com{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Agentic-OS",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:300]
        raise HTTPException(e.code, f"GitHub API error: {err}")

@app.get("/api/github/status")
def github_status():
    """Check GitHub connection and return user info."""
    try:
        user = _github_api("/user")
        return {
            "connected": True,
            "user": user.get("login", ""),
            "name": user.get("name", ""),
            "avatar": user.get("avatar_url", ""),
            "repos_count": user.get("public_repos", 0),
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

@app.get("/api/github/repos")
def github_list_repos():
    """List user's repositories."""
    username, _ = _get_github_credentials()
    repos = _github_api("/user/repos?sort=updated&per_page=30&type=owner")
    return [{
        "name": r["name"],
        "full_name": r["full_name"],
        "private": r["private"],
        "description": r.get("description", ""),
        "url": r["html_url"],
        "clone_url": r["clone_url"],
        "updated": r["updated_at"],
        "language": r.get("language", ""),
    } for r in repos]

@app.post("/api/github/create-repo")
def github_create_repo(data: dict):
    """Create a new GitHub repository."""
    name = (data.get("name", "") or "").strip()
    if not name:
        raise HTTPException(400, "Repository name required")
    description = data.get("description", "")
    private = data.get("private", False)

    repo = _github_api("/user/repos", "POST", {
        "name": name,
        "description": description,
        "private": private,
        "auto_init": False,
    })
    append_audit({"action": "github_repo_created", "repo": name})
    return {
        "name": repo["name"],
        "full_name": repo["full_name"],
        "url": repo["html_url"],
        "clone_url": repo["clone_url"],
    }

@app.post("/api/github/init")
def github_init_repo(data: dict):
    """Initialize a git repo in a project folder and link to GitHub."""
    project_path = (data.get("path", "") or "").strip()
    repo_name = (data.get("name", "") or "").strip()
    make_private = data.get("private", False)

    if not project_path:
        raise HTTPException(400, "Project path required")
    if not repo_name:
        repo_name = Path(project_path).name

    proj = Path(project_path).resolve()
    if not proj.exists():
        raise HTTPException(400, f"Project folder not found: {project_path}")

    # Check if already a git repo
    if (proj / ".git").exists():
        return {"status": "already_initialized", "path": str(proj), "message": "This folder is already a git repository"}

    # Create GitHub repo
    repo = _github_api("/user/repos", "POST", {
        "name": repo_name,
        "private": make_private,
        "auto_init": False,
    })

    # Init git locally
    username, token = _get_github_credentials()
    clone_url = repo["clone_url"]
    auth_url = clone_url.replace("https://", f"https://{username}:{token}@")

    subprocess.run(["git", "init"], cwd=str(proj), capture_output=True, text=True)
    subprocess.run(["git", "remote", "add", "origin", auth_url], cwd=str(proj), capture_output=True, text=True)

    # Create .gitignore if not exists
    gitignore = proj / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text("__pycache__/\n*.pyc\n.env\nnode_modules/\ndata/\n*.db\n.DS_Store\n")

    # Initial commit
    subprocess.run(["git", "add", "-A"], cwd=str(proj), capture_output=True, text=True)
    result = subprocess.run(["git", "commit", "-m", "Initial commit via Agentic OS"], cwd=str(proj), capture_output=True, text=True)

    # Push
    push = subprocess.run(["git", "push", "-u", "origin", "main"], cwd=str(proj), capture_output=True, text=True)

    append_audit({"action": "github_init", "path": str(proj), "repo": repo_name})
    return {
        "status": "initialized",
        "repo": repo["full_name"],
        "url": repo["html_url"],
        "path": str(proj),
        "commit": result.stdout.strip() or result.stderr.strip(),
        "push": push.stdout.strip() or push.stderr.strip(),
    }

@app.post("/api/github/commit")
def github_commit(data: dict):
    """Commit and push changes in a project."""
    project_path = (data.get("path", "") or "").strip()
    message = (data.get("message", "") or "Update via Agentic OS").strip()

    if not project_path:
        raise HTTPException(400, "Project path required")
    proj = Path(project_path).resolve()
    if not (proj / ".git").exists():
        raise HTTPException(400, "Not a git repository. Initialize first.")

    # Stage changes
    files_to_add = data.get("files", [])
    if files_to_add:
        for f in files_to_add:
            subprocess.run(["git", "add", f], cwd=str(proj), capture_output=True, text=True)
    else:
        subprocess.run(["git", "add", "-A"], cwd=str(proj), capture_output=True, text=True)

    # Check if there are changes
    status = subprocess.run(["git", "status", "--porcelain"], cwd=str(proj), capture_output=True, text=True)
    if not status.stdout.strip():
        return {"status": "nothing_to_commit", "message": "No changes to commit"}

    # Commit
    result = subprocess.run(["git", "commit", "-m", message], cwd=str(proj), capture_output=True, text=True)

    # Push
    push = subprocess.run(["git", "push"], cwd=str(proj), capture_output=True, text=True)

    append_audit({"action": "github_commit", "path": str(proj), "message": message})
    return {
        "status": "committed",
        "commit": result.stdout.strip() or result.stderr.strip(),
        "push": push.stdout.strip() or push.stderr.strip(),
    }

@app.post("/api/github/push")
def github_push(data: dict):
    """Push to remote."""
    project_path = (data.get("path", "") or "").strip()
    if not project_path:
        raise HTTPException(400, "Project path required")
    proj = Path(project_path).resolve()
    if not (proj / ".git").exists():
        raise HTTPException(400, "Not a git repository.")

    push = subprocess.run(["git", "push"], cwd=str(proj), capture_output=True, text=True)
    return {"status": "pushed", "output": push.stdout.strip() or push.stderr.strip()}

@app.get("/api/github/project-info")
def github_project_info(path: str = Query("")):
    """Get git status of a project folder."""
    if not path:
        proj = BASE_DIR
    else:
        proj = Path(path).resolve()

    if not (proj / ".git").exists():
        return {"is_repo": False, "path": str(proj)}

    # Get status
    status = subprocess.run(["git", "status", "--porcelain"], cwd=str(proj), capture_output=True, text=True)
    changed = [l.strip() for l in status.stdout.strip().split("\n") if l.strip()]

    # Get remote
    remote = subprocess.run(["git", "remote", "get-url", "origin"], cwd=str(proj), capture_output=True, text=True)
    remote_url = remote.stdout.strip()
    # Clean token from URL
    if "@" in remote_url:
        remote_url = "https://github.com/" + remote_url.split("@github.com/")[-1] if "@github.com/" in remote_url else remote_url

    # Get branch
    branch = subprocess.run(["git", "branch", "--show-current"], cwd=str(proj), capture_output=True, text=True)

    # Get last commit
    last_commit = subprocess.run(["git", "log", "-1", "--format=%h %s (%ar)"], cwd=str(proj), capture_output=True, text=True)

    return {
        "is_repo": True,
        "path": str(proj),
        "branch": branch.stdout.strip(),
        "remote": remote_url,
        "changed_files": changed,
        "changed_count": len(changed),
        "last_commit": last_commit.stdout.strip(),
    }

# ─── 5 New Pro Features — v2.1 ──────────────────────────────────

# 1. Context Injection — auto-inject memory into agent chats
@app.get("/api/brain/context")
def get_brain_context(max_tokens: int = 4000):
    brain_dir = BASE_DIR / "brain"
    if not brain_dir.exists():
        return {"context": "", "files": []}
    parts, files_list, total = [], [], 0
    max_chars = max_tokens * 4
    for f in sorted(brain_dir.glob("*.md")):
        if total >= max_chars: break
        c = read_file(f)
        if c.strip():
            parts.append(f"## {f.stem.replace('-',' ').title()}\n{c[:max_chars-total]}")
            files_list.append(f.name)
            total += min(len(c), max_chars - total)
    return {"context": "\n\n".join(parts), "files": files_list, "total_chars": total}

# 2. Task Templates
TASK_TEMPLATES = {
    "code-review": {"title":"Code Review","description":"Review code for bugs, security issues, improvements","agent":"gemini","priority":"medium","category":"code"},
    "deploy": {"title":"Deploy to Production","description":"Build and deploy to production server","agent":"opencode","priority":"high","category":"devops"},
    "backup": {"title":"Daily Backup","description":"Create backup of all databases and configs","agent":"hermes","priority":"medium","category":"maintenance"},
    "research": {"title":"Research Topic","description":"Research and summarize with sources","agent":"gemini","priority":"low","category":"research"},
    "fix-bug": {"title":"Fix Bug","description":"Investigate, find root cause, implement fix","agent":"opencode","priority":"high","category":"code"},
    "report": {"title":"Activity Report","description":"Generate daily summary of activities and costs","agent":"hermes","priority":"medium","category":"reporting"},
    "docs": {"title":"Write Documentation","description":"Write clear documentation for feature/module","agent":"gemini","priority":"low","category":"docs"},
    "optimize": {"title":"Optimize Performance","description":"Profile, identify bottlenecks, improve","agent":"opencode","priority":"medium","category":"optimization"},
}

@app.get("/api/tasks/templates")
def get_task_templates():
    return {"templates": TASK_TEMPLATES}

@app.post("/api/tasks/batch")
def batch_task_action(data: dict):
    ids, action = data.get("ids",[]), data.get("action","")
    if not ids or not action: raise HTTPException(400, "ids and action required")
    results = []
    for tid in ids:
        t = _active_tasks.get(tid)
        if not t: results.append({"id":tid,"status":"not_found"}); continue
        if action == "cancel": t["status"]="cancelled"; t["completed"]=get_timestamp()
        elif action == "delete": _active_tasks.pop(tid,None); tasks=_load_json(TASKS_FILE,[]); tasks=[x for x in tasks if x["id"]!=tid]; _save_json(TASKS_FILE,tasks)
        elif action == "retry": t["status"]="pending"; t["progress"]=0; t["error"]=None
        results.append({"id":tid,"status":t.get("status","deleted")})
    return {"results":results,"action":action}

# 3. Cost Optimization
@app.get("/api/analytics/efficiency")
def get_cost_efficiency():
    metrics = _load_json(METRICS_FILE, {"agents":{},"history":[]})
    eff = {}
    for name in ["opencode","hermes","gemini","jcode"]:
        runs = metrics.get("agents",{}).get(name,{}).get("runs",[])
        if not runs: eff[name]={"tokens_per_task":0,"cost_per_task":0}; continue
        total_t = sum(r.get("tokens_used",0) for r in runs)
        total_c = sum(r.get("cost",0) for r in runs)
        succ = [r for r in runs if r.get("success",True)]
        eff[name]={"total_tasks":len(runs),"tokens_per_task":round(total_t/len(runs)),"cost_per_task":round(total_c/len(runs),6),"success_rate":round(len(succ)/len(runs)*100,1),"total_tokens":total_t,"total_cost":round(total_c,6)}
    cost_d = _load_json(BASE_DIR/"data"/"cost-history.json",{"entries":[]})
    models = {}
    for e in cost_d.get("entries",[]):
        m = e.get("model","unknown"); models.setdefault(m,{"tokens":0,"cost":0,"calls":0})
        models[m]["tokens"]+=e.get("tokens",0); models[m]["cost"]+=e.get("cost",0); models[m]["calls"]+=1
    for m in models: models[m]["cost_per_1k"]=round(models[m]["cost"]/max(models[m]["tokens"],1)*1000,6)
    return {"agents":eff,"models":models}

# 4. Skill Improvement Suggestions
@app.post("/api/skills/suggest-improvement/{name}")
def suggest_skill_improvement(name: str):
    if ".." in name or "/" in name: raise HTTPException(400,"Invalid")
    path = BASE_DIR/"skills"/name
    if not path.exists(): raise HTTPException(404,"Not found")
    sm = read_file(path/"SKILL.md")
    scores = json.loads((path/"score-history.json").read_text()) if (path/"score-history.json").exists() else []
    prompt = f"Analyze skill '{name}':\n{sm[:2000]}\n\nRuns: {len(scores)}. Suggest 3 specific improvements as numbered list."
    try: resp = call_llm([{"role":"user","content":prompt}]); return {"skill":name,"suggestions":resp}
    except Exception as e: return {"skill":name,"suggestions":f"Error: {e}"}

# 5. Dashboard Widget Config
DASHBOARD_CFG = BASE_DIR/"data"/"dashboard-config.json"

@app.get("/api/dashboard/config")
def get_dashboard_config():
    return _load_json(DASHBOARD_CFG,{"widgets":{"stats":True,"agents":True,"activity":True,"cost_chart":True,"alerts":True,"system_health":True,"quick_actions":True},"refresh_interval":30})

@app.put("/api/dashboard/config")
def update_dashboard_config(data: dict):
    _save_json(DASHBOARD_CFG,data)
    return {"status":"saved"}


# ─── Main ─────────────────────────────────────────────────────────
@app.post("/api/webhook")
def webhook_receiver(data: dict):
    """Generic webhook receiver — triggers skill execution by event type."""
    event_type = data.get("event", data.get("type", "unknown"))
    skill_name = data.get("skill", "")
    payload = data.get("payload", {})
    if skill_name:
        from scheduler.scheduler import run_skill
        result = run_skill(skill_name, trigger=f"webhook:{event_type}", input_text=json.dumps(payload))
        append_audit({"action": "webhook_received", "event": event_type, "skill": skill_name})
        return {"status": "processed", "event": event_type, "skill": skill_name, "result": result}
    append_audit({"action": "webhook_received", "event": event_type})
    return {"status": "received", "event": event_type}

@app.get("/api/scheduler/events")
def get_scheduler_events(limit: int = Query(50, le=200)):
    from scheduler.scheduler import get_history
    return {"events": get_history(limit=limit)}

@app.post("/api/scheduler/trigger/{job_id}")
def trigger_job(job_id: str):
    from scheduler.scheduler import get_job_by_id, run_skill
    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    result = run_skill(job["skill"], trigger="manual")
    append_audit({"action": "job_triggered", "job_id": job_id, "skill": job["skill"]})
    return result

@app.post("/api/webhook/generic")
def generic_webhook(data: dict):
    """Catch-all webhook receiver for external tool integrations."""
    source = data.get("source", "unknown")
    event = data.get("event", data.get("action", "trigger"))
    skill = data.get("skill", "")
    if skill:
        from scheduler.scheduler import run_skill
        run_skill(skill, trigger=f"webhook:{source}:{event}")
        append_audit({"action": "generic_webhook", "source": source, "event": event, "skill": skill})
    return {"status": "ok", "source": source, "event": event}

# ─── Routes: Memory Search & Auto-Skill Generator (v0.3.0) ─────────

@app.get("/api/memory/search")
def memory_search(q: str = Query(""), limit: int = Query(20, le=100)):
    from brain.memory_search import search, extract_entities
    results = search(q, limit) if q else []
    entities = extract_entities(q) if q else []
    return {"results": results, "entities": entities, "query": q}

@app.post("/api/memory/reindex")
def memory_reindex():
    from brain.memory_search import reindex_all
    reindex_all()
    append_audit({"action": "memory_reindexed"})
    return {"status": "reindexed"}

@app.get("/api/memory/entities")
def list_entities(entity_type: str = "", limit: int = Query(50, le=200)):
    from brain.memory_search import get_entities
    return {"entities": get_entities(entity_type=entity_type, limit=limit)}

@app.post("/api/skills/generate")
def generate_skill(data: dict):
    """Auto-generate a SKILL.md from a natural language description."""
    name = data.get("name", "").strip().lower().replace(" ", "-")
    description = data.get("description", "").strip()
    if not name or not description:
        raise HTTPException(400, "Both 'name' and 'description' are required")
    if not re.match(r'^[a-z0-9-]+$', name):
        raise HTTPException(400, "Skill name must be alphanumeric with hyphens")
    skill_dir = BASE_DIR / "skills" / name
    if skill_dir.exists():
        raise HTTPException(409, "Skill already exists")
    skill_dir.mkdir(parents=True)
    (skill_dir / "context").mkdir(exist_ok=True)
    skill_md = f"""# {description}

{description}

## Usage
Generate this skill by running it with appropriate input.

## Input
- Natural language description of what to do

## Output
- Executed task result

## Primary: opencode
"""
    (skill_dir / "SKILL.md").write_text(skill_md)
    (skill_dir / "learnings.md").write_text(f"# {name}\n\nAuto-generated skill.\n")
    eval_data = {"criteria": ["completeness", "accuracy", "efficiency"], "weights": [0.4, 0.3, 0.3]}
    (skill_dir / "eval.json").write_text(json.dumps(eval_data, indent=2))
    (skill_dir / "score-history.json").write_text("[]")
    append_audit({"action": "skill_generated", "name": name, "description": description})
    return {"status": "created", "name": name, "skill": skill_md}

# ─── Routes: Error Tracking (v0.3.0) ───────────────────────────────

ERROR_LOG_FILE = BASE_DIR / "data" / "error-log.json"

def log_error(source: str, message: str, category: str = "general", details: dict = None):
    errors = []
    if ERROR_LOG_FILE.exists():
        errors = json.loads(ERROR_LOG_FILE.read_text())
    errors.append({
        "id": str(uuid.uuid4())[:8],
        "source": source,
        "message": message,
        "category": category,
        "details": details or {},
        "timestamp": get_timestamp(),
    })
    if len(errors) > 500:
        errors = errors[-500:]
    ERROR_LOG_FILE.write_text(json.dumps(errors, indent=2))

@app.get("/api/errors")
def get_errors(limit: int = Query(50, le=200), category: str = ""):
    if not ERROR_LOG_FILE.exists():
        return {"errors": []}
    errors = json.loads(ERROR_LOG_FILE.read_text())
    if category:
        errors = [e for e in errors if e.get("category") == category]
    return {"errors": errors[-limit:]}

@app.delete("/api/errors")
def clear_errors():
    if ERROR_LOG_FILE.exists():
        ERROR_LOG_FILE.write_text("[]")
    return {"status": "cleared"}

@app.post("/api/errors/report")
def report_error(data: dict):
    log_error(
        source=data.get("source", "unknown"),
        message=data.get("message", ""),
        category=data.get("category", "general"),
        details=data.get("details"),
    )
    return {"status": "reported"}

# ─── Circuit Breaker (v0.3.0) ──────────────────────────────────────

CIRCUIT_BREAKER_FILE = BASE_DIR / "data" / "circuit-breaker.json"

def _get_circuit_state() -> dict:
    if CIRCUIT_BREAKER_FILE.exists():
        return json.loads(CIRCUIT_BREAKER_FILE.read_text())
    return {"agents": {}, "threshold": 3, "recovery_timeout": 300}

def _save_circuit_state(state: dict):
    CIRCUIT_BREAKER_FILE.write_text(json.dumps(state, indent=2))

@app.get("/api/circuit-breaker")
def get_circuit_breaker():
    state = _get_circuit_state()
    now = time.time()
    for agent, cb in state.get("agents", {}).items():
        if cb.get("state") == "open" and now - cb.get("opened_at", 0) > state.get("recovery_timeout", 300):
            cb["state"] = "half-open"
    return state

@app.post("/api/circuit-breaker/trip")
def trip_circuit_breaker(data: dict):
    agent = data.get("agent", "")
    if agent not in ["opencode", "hermes", "gemini", "jcode"]:
        raise HTTPException(400, "Invalid agent")
    state = _get_circuit_state()
    if agent not in state["agents"]:
        state["agents"][agent] = {"state": "closed", "failures": 0, "opened_at": None}
    cb = state["agents"][agent]
    cb["failures"] = cb.get("failures", 0) + 1
    if cb["failures"] >= state["threshold"]:
        cb["state"] = "open"
        cb["opened_at"] = time.time()
    _save_circuit_state(state)
    append_audit({"action": "circuit_tripped", "agent": agent, "failures": cb["failures"]})
    return {"agent": agent, "state": cb["state"], "failures": cb["failures"]}

@app.post("/api/circuit-breaker/reset")
def reset_circuit_breaker(data: dict):
    agent = data.get("agent", "")
    if agent not in ["opencode", "hermes", "gemini", "jcode"]:
        raise HTTPException(400, "Invalid agent")
    state = _get_circuit_state()
    state["agents"][agent] = {"state": "closed", "failures": 0, "opened_at": None}
    _save_circuit_state(state)
    return {"agent": agent, "state": "closed"}

# ─── Routes: Standards ────────────────────────────────────────────

@app.get("/api/standards")
def list_standards():
    std_dir = BASE_DIR / "standards"
    if not std_dir.exists():
        return {"standards": []}
    standards = []
    index_file = std_dir / "index.yml"
    index_content = read_file(index_file)
    for f in std_dir.glob("*.md"):
        standards.append({
            "name": f.stem,
            "content": read_file(f),
        })
    return {"standards": standards, "index": index_content}

@app.post("/api/standards/discover")
def discover_standards():
    # Stub: scans codebase for patterns
    append_audit({"action": "standards_discovery_run"})
    return {"status": "discovery_started", "message": "Scanning codebase for patterns..."}

# ─── Routes: Chat ─────────────────────────────────────────────────

CHAT_HISTORY_FILE = BASE_DIR / "data" / "chat-history.json"

def load_chat_history():
    if not CHAT_HISTORY_FILE.exists():
        return {"messages": []}
    try:
        data = json.loads(CHAT_HISTORY_FILE.read_text())
        if isinstance(data, dict) and "messages" in data:
            return data
    except (json.JSONDecodeError, TypeError):
        pass
    return {"messages": []}

def save_chat_message(msg: dict):
    history = load_chat_history()
    history.setdefault("messages", []).append(msg)
    if len(history["messages"]) > 200:
        history["messages"] = history["messages"][-200:]
    CHAT_HISTORY_FILE.write_text(json.dumps(history, indent=2))

def run_cli(args: list, timeout: int = 30) -> tuple:
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    return r.returncode, r.stdout, r.stderr

def clean_hermes_output(raw: str) -> str:
    """Strip CLI metadata from Hermes output, returning only the AI response."""
    if not raw:
        return ""
    lines = raw.split('\n')
    in_box = False
    content_lines = []
    for line in lines:
        if '╭─' in line:
            in_box = True
            continue
        if '╰─' in line:
            in_box = False
            continue
        if in_box:
            # Remove ANSI escape codes and leading whitespace
            cleaned = line.strip()
            if cleaned:
                content_lines.append(cleaned)
    if content_lines:
        return '\n'.join(content_lines)
    # Fallback: if no box found, return last non-metadata line
    non_meta = [l.strip() for l in lines if l.strip() and not l.startswith(('Query:', 'Initializing', '──', 'Resume', 'Session:', 'Duration:', 'Messages:'))]
    return '\n'.join(non_meta[-5:]) or raw

def execute_agent(agent: str, message: str) -> str:
    try:
        if agent == "opencode":
            # Use DeepSeek API directly for opencode agent
            return call_llm([{"role": "user", "content": message}], provider="deepseek")

        elif agent == "hermes":
            # Use OpenRouter API directly for Hermes agent
            return call_llm([{"role": "user", "content": message}], provider="openrouter")

        elif agent == "gemini":
            # Use Gemini API directly
            return call_llm([{"role": "user", "content": message}], provider="gemini")

        elif agent == "jcode":
            return call_llm([
                {"role": "system", "content": "You are a JavaScript/Node.js expert. Help with JS, TypeScript, Node, npm, frontend frameworks. Respond concisely with code examples when relevant."},
                {"role": "user", "content": message}
            ], provider="deepseek")

        else:
            return f"Unknown agent: {agent}"
    except subprocess.TimeoutExpired:
        return f"⏱ Agent '{agent}' timed out.\n\nRun `{agent} --help` in your terminal for CLI usage.\n\n**Message:** {message[:100]}"
    except FileNotFoundError:
        return f"⚠ Agent '{agent}' CLI not installed. Install it and try again."
    except Exception as e:
        return f"⚠ Error communicating with {agent}: {str(e)}"

@app.post("/api/chat")
def chat(req: ChatRequest):
    agent = req.agent.lower().strip()
    if agent not in ["opencode", "hermes", "gemini", "jcode"]:
        raise HTTPException(400, "Agent must be one of: opencode, hermes, gemini, jcode")
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(400, "Message cannot be empty")
    if len(message) > 10000:
        raise HTTPException(400, "Message too long (max 10000 characters)")

    user_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "user",
        "agent": agent,
        "content": message,
        "timestamp": get_timestamp(),
    }
    save_chat_message(user_msg)

    response_text = execute_agent(agent, message)

    agent_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "assistant",
        "agent": agent,
        "content": response_text,
        "timestamp": get_timestamp(),
    }
    save_chat_message(agent_msg)

    append_audit({"action": "chat_message", "agent": agent, "msg_preview": message[:50]})

    return {"status": "ok", "response": agent_msg}

@app.post("/api/chat/llm")
def chat_llm(data: dict):
    """Direct LLM chat using DeepSeek or OpenRouter API."""
    message = (data.get("message", "") or "").strip()
    provider = data.get("provider", "deepseek")
    model = data.get("model", None)
    system = data.get("system", "You are a helpful AI assistant.")

    if not message:
        raise HTTPException(400, "Message cannot be empty")
    if len(message) > 10000:
        raise HTTPException(400, "Message too long (max 10000 characters)")
    if provider not in ("deepseek", "openrouter", "gemini"):
        raise HTTPException(400, "Provider must be: deepseek or openrouter")

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": message},
    ]

    user_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "user",
        "agent": f"llm:{provider}",
        "content": message,
        "timestamp": get_timestamp(),
    }
    save_chat_message(user_msg)

    response_text = call_llm(messages, provider=provider, model=model)

    agent_msg = {
        "id": str(uuid.uuid4())[:8],
        "role": "assistant",
        "agent": f"llm:{provider}",
        "content": response_text,
        "timestamp": get_timestamp(),
    }
    save_chat_message(agent_msg)

    append_audit({"action": "chat_llm", "provider": provider, "msg_preview": message[:50]})

    return {
        "status": "ok",
        "response": agent_msg,
        "provider": provider,
        "model": model or _load_settings().get("llm", {}).get(f"{provider}_model", provider),
    }

@app.post("/api/chat/stream")
async def chat_stream(data: dict):
    """Streaming chat via SSE with real-time token output."""
    agent = (data.get("agent", "") or "").lower().strip()
    message = (data.get("message", "") or "").strip()
    project_path = (data.get("project", "") or "").strip()
    if not message:
        raise HTTPException(400, "Message required")

    provider_map = {"opencode": "deepseek", "hermes": "openrouter", "gemini": "gemini", "jcode": "deepseek"}
    provider = provider_map.get(agent, "deepseek") if agent in provider_map else (
        agent.replace("llm:", "") if agent.startswith("llm:") else "deepseek"
    )

    # Build project context
    project_context = ""
    if project_path:
        proj_dir = Path(project_path).resolve()
        if proj_dir.exists():
            files = []
            try:
                for p in sorted(proj_dir.iterdir()):
                    if not p.name.startswith(".") and p.is_file():
                        try:
                            size = p.stat().st_size
                            if size < 50000:
                                files.append(f"  {p.name} ({size} bytes)")
                        except:
                            pass
                project_context = f"\n\nWORKING DIRECTORY: {proj_dir}\nFiles:\n" + "\n".join(files[:30])
            except:
                pass

    messages = []
    if project_context:
        messages.append({"role": "system", "content": f"You are working in the project directory: {project_context}. You can read files using /api/files/read and write using /api/files/write."})
    messages.append({"role": "user", "content": message})

    user_msg = {"id": str(uuid.uuid4())[:8], "role": "user", "agent": agent, "content": message, "timestamp": get_timestamp()}
    save_chat_message(user_msg)

    async def generate():
        full_response = ""
        yield f"data: {json.dumps({'type': 'start', 'agent': agent})}\n\n"
        try:
            if provider == "openrouter":
                streamer = stream_openrouter(messages)
            elif provider == "gemini":
                text = call_gemini(messages)
                streamer = stream_gemini_chunks(text)
            else:
                streamer = stream_deepseek(messages)
            for token in streamer:
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'text': str(e)})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'text': ''})}\n\n"

        agent_msg = {"id": str(uuid.uuid4())[:8], "role": "assistant", "agent": agent, "content": full_response, "timestamp": get_timestamp()}
        save_chat_message(agent_msg)
        append_audit({"action": "chat_stream", "agent": agent, "msg_preview": message[:50]})

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/api/chat/history")
def get_chat_history():
    return load_chat_history()

# ─── Routes: Project Context & File Operations ───────────────────

@app.get("/api/projects")
def list_projects(path: str = Query("")):
    base = Path(path) if path else BASE_DIR
    base = base.resolve()
    items = []
    try:
        for p in sorted(base.iterdir()):
            if p.name.startswith("."):
                continue
            items.append({"name": p.name, "type": "dir" if p.is_dir() else "file", "size": p.stat().st_size if p.is_file() else 0})
    except Exception as e:
        return {"error": str(e), "items": [], "path": str(base)}
    return {"items": items[:100], "path": str(base)}

@app.post("/api/files/read")
def read_file_api(data: dict):
    filepath = (data.get("path", "") or "").strip()
    if not filepath:
        raise HTTPException(400, "Path required")
    p = Path(filepath).resolve()
    if not p.exists():
        raise HTTPException(404, f"File not found: {filepath}")
    if not p.is_file():
        raise HTTPException(400, "Not a file")
    try:
        content = p.read_text(encoding="utf-8")
        return {"path": str(p), "content": content, "size": len(content)}
    except:
        return {"path": str(p), "content": f"[Binary file: {p.stat().st_size} bytes]", "size": 0}

@app.post("/api/files/write")
def write_file_api(data: dict):
    filepath = (data.get("path", "") or "").strip()
    content = data.get("content", "")
    if not filepath:
        raise HTTPException(400, "Path required")
    p = Path(filepath).resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    append_audit({"action": "file_write", "path": str(p)})
    return {"path": str(p), "size": len(content), "status": "saved"}

# ═══════════════════════════════════════════════════════════════════
# v0.2.0 — New Feature Endpoints
# ═══════════════════════════════════════════════════════════════════

# ─── Models ─────────────────────────────────────────────────────

class KanbanTaskCreate(BaseModel):
    title: str
    body: str = ""
    status: str = "triage"
    priority: str = "medium"
    assignee: str = ""

class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None

class KanbanComplete(BaseModel):
    summary: str = ""

class KanbanBlock(BaseModel):
    reason: str = ""

class KanbanCommentCreate(BaseModel):
    message: str

class KanbanLinkCreate(BaseModel):
    parent_id: str
    child_id: str

class GoalCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "general"
    target_date: str = ""

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    target_date: Optional[str] = None
    progress: Optional[int] = None
    status: Optional[str] = None

class JournalSave(BaseModel):
    content: str

class RouterSuggest(BaseModel):
    task: str

class RouterRoute(BaseModel):
    task: str
    agent: str

# ─── Data Helpers ───────────────────────────────────────────────

KANBAN_DIR = BASE_DIR / "data" / "kanban"
GOALS_FILE = BASE_DIR / "data" / "goals.json"
JOURNAL_DIR = BASE_DIR / "brain" / "journal"

def ensure_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)

def load_kanban_tasks():
    ensure_dir(KANBAN_DIR)
    tasks = []
    for f in sorted(KANBAN_DIR.glob("*.json")):
        tasks.append(json.loads(f.read_text()))
    return tasks

def save_kanban_task(task: dict):
    ensure_dir(KANBAN_DIR)
    (KANBAN_DIR / f"{task['id']}.json").write_text(json.dumps(task, indent=2))

def load_goals():
    if GOALS_FILE.exists():
        return json.loads(GOALS_FILE.read_text())
    return []

def save_goals(goals: list):
    GOALS_FILE.write_text(json.dumps(goals, indent=2))

# ─── Routes: Kanban Board (13 endpoints) ────────────────────────

@app.get("/api/kanban/board")
def kanban_board(status: Optional[str] = None):
    try:
        tasks = load_kanban_tasks()
        if status:
            tasks = [t for t in tasks if t.get("status") == status]
        columns = {"triage": [], "todo": [], "ready": [], "in_progress": [], "blocked": [], "done": []}
        for t in tasks:
            s = t.get("status", "triage")
            if s in columns:
                columns[s].append(t)
        return {"columns": columns, "total": len(tasks)}
    except Exception as e:
        return {"error": str(e), "columns": {}, "total": 0}

@app.get("/api/kanban/tasks/{task_id}")
def kanban_get_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    return json.loads(path.read_text())

@app.post("/api/kanban/tasks")
def kanban_create_task(data: KanbanTaskCreate):
    try:
        task = {
            "id": str(uuid.uuid4())[:8],
            "title": data.title,
            "body": data.body,
            "status": data.status,
            "priority": data.priority,
            "assignee": data.assignee,
            "comments": [],
            "links": [],
            "created": get_timestamp(),
            "updated": get_timestamp(),
        }
        save_kanban_task(task)
        append_audit({"action": "kanban_task_created", "title": data.title})
        return task
    except Exception as e:
        raise HTTPException(500, str(e))

@app.patch("/api/kanban/tasks/{task_id}")
def kanban_update_task(task_id: str, data: KanbanTaskUpdate):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    for field in ["title", "body", "status", "priority", "assignee"]:
        val = getattr(data, field, None)
        if val is not None:
            task[field] = val
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_updated", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/complete")
def kanban_complete_task(task_id: str, data: KanbanComplete):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "done"
    task["summary"] = data.summary
    task["completed_at"] = get_timestamp()
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_completed", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/block")
def kanban_block_task(task_id: str, data: KanbanBlock):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "blocked"
    task["block_reason"] = data.reason
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_blocked", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/unblock")
def kanban_unblock_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    task["status"] = "ready"
    task["block_reason"] = ""
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    append_audit({"action": "kanban_task_unblocked", "task_id": task_id})
    return task

@app.post("/api/kanban/tasks/{task_id}/comments")
def kanban_add_comment(task_id: str, data: KanbanCommentCreate):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    comment = {
        "id": str(uuid.uuid4())[:8],
        "message": data.message,
        "timestamp": get_timestamp(),
    }
    task.setdefault("comments", []).append(comment)
    task["updated"] = get_timestamp()
    save_kanban_task(task)
    return task

@app.post("/api/kanban/links")
def kanban_add_link(data: KanbanLinkCreate):
    for tid in [data.parent_id, data.child_id]:
        path = KANBAN_DIR / f"{tid}.json"
        if not path.exists():
            raise HTTPException(404, f"Task {tid} not found")
        t = json.loads(path.read_text())
        t.setdefault("links", [])
        link = {"parent": data.parent_id, "child": data.child_id}
        if link not in t["links"]:
            t["links"].append(link)
        t["updated"] = get_timestamp()
        save_kanban_task(t)
    append_audit({"action": "kanban_link_added", "parent": data.parent_id, "child": data.child_id})
    return {"status": "linked"}

@app.delete("/api/kanban/links")
def kanban_remove_link(parent_id: str = Query(...), child_id: str = Query(...)):
    for tid in [parent_id, child_id]:
        path = KANBAN_DIR / f"{tid}.json"
        if path.exists():
            t = json.loads(path.read_text())
            t.setdefault("links", [])
            t["links"] = [l for l in t["links"] if not (l.get("parent") == parent_id and l.get("child") == child_id)]
            t["updated"] = get_timestamp()
            save_kanban_task(t)
    return {"status": "unlinked"}

@app.post("/api/kanban/dispatch")
def kanban_dispatch():
    append_audit({"action": "kanban_dispatch_triggered"})
    return {"status": "dispatch_triggered", "message": "Dispatcher notified"}

@app.post("/api/kanban/tasks/{task_id}/specify")
def kanban_specify_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    if task.get("status") == "triage":
        task["status"] = "todo"
        task["updated"] = get_timestamp()
        save_kanban_task(task)
    return task

@app.post("/api/kanban/tasks/{task_id}/decompose")
def kanban_decompose_task(task_id: str):
    path = KANBAN_DIR / f"{task_id}.json"
    if not path.exists():
        raise HTTPException(404, "Task not found")
    task = json.loads(path.read_text())
    children = []
    for i, subtask in enumerate(task.get("body", "").split("\n")):
        subtask = subtask.strip().lstrip("-* ")
        if subtask:
            child = {
                "id": str(uuid.uuid4())[:8],
                "title": subtask[:80],
                "body": subtask,
                "status": "todo",
                "priority": task.get("priority", "medium"),
                "assignee": "",
                "comments": [],
                "links": [{"parent": task_id, "child": ""}],
                "created": get_timestamp(),
                "updated": get_timestamp(),
            }
            child["links"][0]["child"] = child["id"]
            save_kanban_task(child)
            children.append(child)
    return {"parent": task_id, "children": children}

# ─── Routes: Goals (4 endpoints) ─────────────────────────────────

@app.get("/api/goals")
def list_goals():
    try:
        return {"goals": load_goals()}
    except Exception as e:
        return {"goals": [], "error": str(e)}

@app.post("/api/goals")
def create_goal(data: GoalCreate):
    try:
        goals = load_goals()
        goal = {
            "id": str(uuid.uuid4())[:8],
            "title": data.title,
            "description": data.description,
            "category": data.category,
            "target_date": data.target_date,
            "status": "active",
            "progress": 0,
            "created": get_timestamp(),
            "updated": get_timestamp(),
        }
        goals.append(goal)
        save_goals(goals)
        # Auto-sync to brain/active-projects.md
        active_path = BASE_DIR / "brain" / "active-projects.md"
        if active_path.exists():
            existing = active_path.read_text()
            existing += f"\n- [{goal['title']}](goal:{goal['id']}) — {goal['description'][:80]}\n"
            active_path.write_text(existing)
        append_audit({"action": "goal_created", "title": data.title})
        return goal
    except Exception as e:
        raise HTTPException(500, str(e))

@app.put("/api/goals/{goal_id}")
def update_goal(goal_id: str, data: GoalUpdate):
    try:
        goals = load_goals()
        for g in goals:
            if g["id"] == goal_id:
                for field in ["title", "description", "category", "target_date", "progress", "status"]:
                    val = getattr(data, field, None)
                    if val is not None:
                        g[field] = val
                g["updated"] = get_timestamp()
                save_goals(goals)
                return g
        raise HTTPException(404, "Goal not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: str):
    try:
        goals = load_goals()
        goals = [g for g in goals if g["id"] != goal_id]
        save_goals(goals)
        append_audit({"action": "goal_deleted", "goal_id": goal_id})
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(500, str(e))

# ─── Routes: Journal (4 endpoints) ───────────────────────────────

@app.get("/api/journal/entries")
def list_journal_entries():
    try:
        ensure_dir(JOURNAL_DIR)
        entries = []
        for f in sorted(JOURNAL_DIR.glob("*.md"), reverse=True):
            entries.append({
                "date": f.stem,
                "preview": f.read_text()[:200],
                "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            })
        return {"entries": entries}
    except Exception as e:
        return {"entries": [], "error": str(e)}

@app.get("/api/journal/entries/{entry_date}")
def get_journal_entry(entry_date: str):
    try:
        path = JOURNAL_DIR / f"{entry_date}.md"
        ensure_dir(JOURNAL_DIR)
        content = path.read_text() if path.exists() else ""
        return {"date": entry_date, "content": content}
    except Exception as e:
        return {"date": entry_date, "content": "", "error": str(e)}

@app.put("/api/journal/entries/{entry_date}")
def save_journal_entry(entry_date: str, data: JournalSave):
    try:
        ensure_dir(JOURNAL_DIR)
        path = JOURNAL_DIR / f"{entry_date}.md"
        path.write_text(data.content)
        append_audit({"action": "journal_saved", "date": entry_date})
        return {"status": "saved", "date": entry_date}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/api/journal/search")
def search_journal(q: str = Query("")):
    try:
        ensure_dir(JOURNAL_DIR)
        if not q:
            return {"results": []}
        results = []
        for f in JOURNAL_DIR.glob("*.md"):
            content = f.read_text()
            if q.lower() in content.lower():
                results.append({"date": f.stem, "preview": content[:200]})
        return {"results": results, "query": q}
    except Exception as e:
        return {"results": [], "error": str(e)}

# ─── Routes: Agent Health (3 endpoints) ──────────────────────────

@app.get("/api/agents/health")
def get_agent_health():
    try:
        agents = []
        for name in ["opencode", "hermes", "gemini", "jcode"]:
            info = check_agent(name)
            info["uptime"] = 0
            info["success_rate"] = 100
            info["last_seen"] = get_timestamp()
            agents.append(info)
        return {"agents": agents, "updated": get_timestamp()}
    except Exception as e:
        return {"agents": [], "error": str(e), "updated": get_timestamp()}

@app.get("/api/agents/{name}/stats")
def get_agent_stats(name: str):
    try:
        if name not in ["opencode", "hermes", "gemini", "jcode"]:
            raise HTTPException(400, "Invalid agent")
        info = check_agent(name)
        return {
            "name": name,
            "status": info["status"],
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "avg_response_time": 0,
            "last_seen": get_timestamp(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/api/agents/health/refresh")
def refresh_agent_health():
    try:
        agents = []
        for name in ["opencode", "hermes", "gemini", "jcode"]:
            info = check_agent(name)
            agents.append(info)
        append_audit({"action": "agent_health_refreshed"})
        return {"agents": agents, "updated": get_timestamp()}
    except Exception as e:
        return {"agents": [], "error": str(e)}

# ─── Routes: Smart Router (2 endpoints) ─────────────────────────

ROUTER_RULES = {
    "opencode": ["code", "devops", "deploy", "git", "file", "terraform", "docker", "test", "build", "infra", "script"],
    "hermes": ["memory", "schedule", "channel", "skill", "cron", "reminder", "brain", "plugin", "backup"],
    "gemini": ["research", "analyze", "search", "compare", "explain", "study", "learn", "document", "report", "review"],
    "jcode": ["javascript", "node", "js", "script", "npm", "frontend", "react", "vue", "typescript", "web", "api"],
}

@app.post("/api/router/suggest")
def router_suggest(data: RouterSuggest):
    try:
        task_lower = data.task.lower()
        scores = {}
        for agent, keywords in ROUTER_RULES.items():
            scores[agent] = sum(1 for k in keywords if k in task_lower)
        best = max(scores, key=scores.get)
        confidence = "high" if scores[best] >= 2 else "medium" if scores[best] == 1 else "low"
        return {
            "suggested_agent": best,
            "confidence": confidence,
            "scores": scores,
            "task": data.task,
        }
    except Exception as e:
        return {"suggested_agent": "opencode", "confidence": "low", "error": str(e)}

@app.post("/api/router/route")
def router_route(data: RouterRoute):
    try:
        agent = data.agent.lower()
        if agent not in ["opencode", "hermes", "gemini", "jcode"]:
            return {"status": "error", "message": f"Invalid agent: {agent}"}
        append_audit({"action": "task_routed", "agent": agent, "task_preview": data.task[:50]})
        return {
            "status": "routed",
            "agent": agent,
            "task": data.task,
            "message": f"Task routed to {agent}",
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─── Routes: Learning Analytics (2 endpoints) ───────────────────

@app.get("/api/analytics/skills")
def get_skill_analytics():
    try:
        skills_dir = BASE_DIR / "skills"
        analytics = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                eval_path = d / "eval.json"
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                eval_data = json.loads(eval_path.read_text()) if eval_path.exists() else {}
                avg_score = sum(s.get("score", 0) for s in scores) / len(scores) if scores else 0
                analytics.append({
                    "name": d.name,
                    "total_runs": len(scores),
                    "avg_score": round(avg_score, 1),
                    "last_score": scores[-1].get("score", 0) if scores else 0,
                    "trend": "up" if len(scores) >= 2 and scores[-1].get("score", 0) > scores[-2].get("score", 0) else "down" if len(scores) >= 2 else "stable",
                })
        return {"skills": sorted(analytics, key=lambda x: x["total_runs"], reverse=True)}
    except Exception as e:
        return {"skills": [], "error": str(e)}

@app.get("/api/analytics/trends")
def get_trend_analytics():
    try:
        skills_dir = BASE_DIR / "skills"
        trends = []
        for d in sorted(skills_dir.iterdir()):
            if d.is_dir() and not d.name.startswith("_"):
                score_path = d / "score-history.json"
                scores = json.loads(score_path.read_text()) if score_path.exists() else []
                if scores:
                    trends.append({
                        "name": d.name,
                        "scores": [s.get("score", 0) for s in scores[-10:]],
                        "labels": [s.get("date", "") for s in scores[-10:]],
                    })
        return {"trends": trends}
    except Exception as e:
        return {"trends": [], "error": str(e)}

# ─── Routes: Session Replay (2 endpoints) ───────────────────────

@app.get("/api/sessions/list")
def list_sessions():
    try:
        sessions = []
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_dir = sessions_dir / "log"
        if log_dir.exists():
            for f in sorted(log_dir.glob("*.log"), reverse=True)[:20]:
                sessions.append({
                    "id": f.stem,
                    "name": f.stem,
                    "size": f.stat().st_size,
                    "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                    "source": "opencode",
                })
        hermes_sessions = Path.home() / ".hermes" / "sessions.json"
        if hermes_sessions.exists():
            sessions.append({
                "id": "hermes-sessions",
                "name": "Hermes Session Archive",
                "size": hermes_sessions.stat().st_size,
                "modified": datetime.fromtimestamp(hermes_sessions.stat().st_mtime).isoformat(),
                "source": "hermes",
            })
        return {"sessions": sessions}
    except Exception as e:
        return {"sessions": [], "error": str(e)}

MAX_SESSION_CONTENT = 2000

@app.get("/api/sessions/{session_id}/replay")
def get_session_replay(session_id: str):
    if ".." in session_id or "/" in session_id:
        raise HTTPException(400, "Invalid session ID")
    try:
        sessions_dir = Path.home() / ".local" / "share" / "opencode"
        log_file = sessions_dir / "log" / f"{session_id}.log"
        if log_file.exists():
            content = log_file.read_text()
            lines = content.split("\n")
            messages = []
            for line in lines:
                if "user:" in line.lower() or "assistant:" in line.lower():
                    messages.append(line)
            return {
                "session_id": session_id,
                "lines": len(lines),
                "messages": messages[:50],
                "content": content[:MAX_SESSION_CONTENT],
            }
        return {"session_id": session_id, "messages": [], "content": "Session log not found"}
    except Exception as e:
        return {"session_id": session_id, "messages": [], "error": str(e)}

# ─── Routes: Dashboard Static Files ──────────────────────────────

dashboard_dir = BASE_DIR / "dashboard"
if dashboard_dir.exists():
    app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir)), name="dashboard")

@app.get("/", response_class=HTMLResponse)
def index():
    html_file = BASE_DIR / "dashboard" / "index.html"
    if html_file.exists():
        content = html_file.read_text()
        content = content.replace('href="styles.css"', 'href="/dashboard/styles.css"')
        content = content.replace('src="utils.js"', 'src="/dashboard/utils.js"')
        content = content.replace('src="api.js"', 'src="/dashboard/api.js"')
        content = content.replace('src="app.js"', 'src="/dashboard/app.js"')
        content = content.replace('pages/', '/dashboard/pages/')
        return HTMLResponse(content=content)
    return HTMLResponse("<h1>Agentic OS</h1><p>Dashboard not built yet. Run <code>./install.sh</code> first.</p>")

# ─── Favicon ──────────────────────────────────────────────────────

FAVICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6c5ce7"/><stop offset="100%" stop-color="#fd79a8"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><polygon points="16,6 24,11 24,21 16,26 8,21 8,11" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="3" fill="white"/></svg>'

@app.get("/favicon.ico")
def favicon():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")

@app.get("/favicon.svg")
def favicon_svg():
    return Response(content=FAVICON_SVG, media_type="image/svg+xml")

# ─── PWA Support (v0.3.0) ──────────────────────────────────────────

MANIFEST_JSON = {
    "name": "Agentic OS",
    "short_name": "AgenticOS",
    "description": "Multi-agent orchestration platform",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0f0f23",
    "theme_color": "#6c5ce7",
    "icons": [
        {"src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable"},
    ],
}

@app.get("/manifest.json")
def manifest():
    return JSONResponse(content=MANIFEST_JSON)

SERVICE_WORKER_JS = """
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => new Response('Offline', {status: 503})));
});
"""

@app.get("/sw.js")
def service_worker():
    return Response(content=SERVICE_WORKER_JS, media_type="application/javascript")

# ═══════════════════════════════════════════════════════════════════
# v2.0 — Professional Agent Management Dashboard
# ═══════════════════════════════════════════════════════════════════

# ─── Data Files ──────────────────────────────────────────────────

TASKS_FILE = BASE_DIR / "data" / "tasks.json"
METRICS_FILE = BASE_DIR / "data" / "metrics.json"
AGENT_CONFIG_FILE = BASE_DIR / "data" / "agent-config.json"
WORKFLOWS_FILE = BASE_DIR / "data" / "workflows.json"
ALERTS_FILE = BASE_DIR / "data" / "alerts.json"
COMPARISONS_FILE = BASE_DIR / "data" / "comparisons.json"

def _load_json(path: Path, default=None):
    if default is None: default = []
    if path.exists():
        try: return json.loads(path.read_text())
        except: return default
    return default

def _save_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2))

# ─── Models ──────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    agent: str = ""
    priority: str = "medium"
    description: str = ""

class TaskAction(BaseModel):
    action: str  # cancel, retry, reroute
    target_agent: str = ""

class MetricRecord(BaseModel):
    agent: str
    task_type: str = ""
    response_time_ms: int = 0
    tokens_used: int = 0
    success: bool = True
    cost: float = 0.0

class AgentConfigUpdate(BaseModel):
    enabled: bool = True
    default_model: str = ""
    rate_limit: int = 0
    capabilities: list = []
    api_key_status: str = "ok"

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    nodes: list = []  # [{id, agent, skill, depends_on: []}]
    enabled: bool = True

class AlertRule(BaseModel):
    name: str
    type: str  # agent_down, high_cost, rate_limit, error_spike, skill_failure
    threshold: float = 0
    agent: str = ""
    enabled: bool = True
    channels: list = []  # email, slack, webhook

class ComparisonRequest(BaseModel):
    prompt: str
    agents: list = ["opencode", "hermes", "gemini"]

# ─── 1. Real-time Agent Orchestration ────────────────────────────

# In-memory task state for real-time orchestration
_active_tasks = {}  # task_id -> task dict
_task_queue = []    # pending task ids
_orchestration_listeners = []  # SSE generators

class OrchestrationEvent:
    """Real-time event bus for dashboard updates."""
    _listeners = []

    @classmethod
    def subscribe(cls):
        import asyncio
        q = asyncio.Queue()
        cls._listeners.append(q)
        return q

    @classmethod
    def publish(cls, event: dict):
        for q in cls._listeners[:]:
            try:
                q.put_nowait(event)
            except:
                cls._listeners.remove(q)

@app.get("/api/orchestration/state")
def get_orchestration_state():
    """Current state of all agents with active tasks."""
    agents_state = {}
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        info = check_agent(name)
        agent_tasks = [t for t in _active_tasks.values() if t.get("agent") == name]
        agents_state[name] = {
            "name": name,
            "status": info["status"],
            "active_tasks": len(agent_tasks),
            "queued_tasks": len([t for t in _task_queue if any(ta.get("agent") == name for ta in [_active_tasks.get(tid, {}) for tid in [_task_queue]] if ta)]),
            "current_task": agent_tasks[0] if agent_tasks else None,
            "last_active": get_timestamp(),
        }

    return {
        "agents": agents_state,
        "active_task_count": len(_active_tasks),
        "queued_task_count": len(_task_queue),
        "updated": get_timestamp(),
    }

@app.get("/api/orchestration/stream")
async def orchestration_stream():
    """SSE stream for real-time orchestration updates."""
    q = OrchestrationEvent.subscribe()

    async def generate():
        yield f"data: {json.dumps({'type': 'connected'})}\n\n"
        try:
            while True:
                event = await q.get()
                yield f"data: {json.dumps({'type': 'event', 'data': event})}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if q in OrchestrationEvent._listeners:
                OrchestrationEvent._listeners.remove(q)

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

# ─── 2. Agent Performance KPIs & Metrics ────────────────────────

@app.get("/api/metrics/kpi")
def get_agent_kpis():
    """Performance KPIs for all agents."""
    metrics = _load_json(METRICS_FILE, {"agents": {}, "history": []})
    agents_kpi = {}
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        agent_data = metrics.get("agents", {}).get(name, {})
        runs = agent_data.get("runs", [])
        if runs:
            response_times = sorted([r.get("response_time_ms", 0) for r in runs])
            success_count = sum(1 for r in runs if r.get("success", True))
            agents_kpi[name] = {
                "name": name,
                "total_runs": len(runs),
                "success_rate": round(success_count / len(runs) * 100, 1) if runs else 100,
                "avg_response_ms": round(sum(response_times) / len(response_times)) if response_times else 0,
                "p50_response_ms": response_times[len(response_times)//2] if response_times else 0,
                "p95_response_ms": response_times[int(len(response_times)*0.95)] if len(response_times) >= 20 else (response_times[-1] if response_times else 0),
                "p99_response_ms": response_times[int(len(response_times)*0.99)] if len(response_times) >= 100 else (response_times[-1] if response_times else 0),
                "total_tokens": sum(r.get("tokens_used", 0) for r in runs),
                "total_cost": round(sum(r.get("cost", 0) for r in runs), 6),
                "error_rate": round((len(runs) - success_count) / len(runs) * 100, 1) if runs else 0,
                "last_24h_runs": sum(1 for r in runs[-100:] if r.get("timestamp", "").startswith(datetime.now(timezone.utc).strftime("%Y-%m-%d"))),
            }
        else:
            agents_kpi[name] = {
                "name": name, "total_runs": 0, "success_rate": 100,
                "avg_response_ms": 0, "p50_response_ms": 0, "p95_response_ms": 0, "p99_response_ms": 0,
                "total_tokens": 0, "total_cost": 0, "error_rate": 0, "last_24h_runs": 0,
            }

    return {"agents": agents_kpi, "updated": get_timestamp()}

@app.post("/api/metrics/record")
def record_metric(data: MetricRecord):
    """Record a task execution metric."""
    metrics = _load_json(METRICS_FILE, {"agents": {}, "history": []})
    agents_data = metrics.setdefault("agents", {})
    agent_data = agents_data.setdefault(data.agent, {"runs": []})

    run = {
        "id": str(uuid.uuid4())[:8],
        "task_type": data.task_type,
        "response_time_ms": data.response_time_ms,
        "tokens_used": data.tokens_used,
        "success": data.success,
        "cost": data.cost,
        "timestamp": get_timestamp(),
    }
    agent_data["runs"].append(run)
    if len(agent_data["runs"]) > 1000:
        agent_data["runs"] = agent_data["runs"][-1000:]
    metrics["history"].append({
        "date": get_timestamp()[:10],
        "agent": data.agent,
        "success": data.success,
    })
    if len(metrics["history"]) > 500:
        metrics["history"] = metrics["history"][-500:]

    _save_json(METRICS_FILE, metrics)
    OrchestrationEvent.publish({"type": "metric_recorded", "agent": data.agent, "success": data.success})
    return {"status": "recorded", "run_id": run["id"]}

@app.get("/api/metrics/trends")
def get_metric_trends():
    """Success rate trends over last 30 days."""
    metrics = _load_json(METRICS_FILE, {"agents": {}, "history": []})
    history = metrics.get("history", [])
    dates = sorted(set(h.get("date", "") for h in history))
    dates = dates[-30:]

    trends = {}
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        trends[name] = []
    for d in dates:
        day_entries = [h for h in history if h.get("date") == d]
        for name in ["opencode", "hermes", "gemini", "jcode"]:
            agent_day = [e for e in day_entries if e.get("agent") == name]
            if agent_day:
                rate = sum(1 for e in agent_day if e.get("success", True)) / len(agent_day) * 100
                trends[name].append(round(rate, 1))
            else:
                trends[name].append(None)

    return {"trends": trends, "labels": dates, "updated": get_timestamp()}

# ─── 3. Unified Task Queue & Workload ────────────────────────────

@app.get("/api/tasks")
def list_tasks(status: str = "", agent: str = ""):
    """List all tasks with optional filters."""
    all_tasks = list(_active_tasks.values())

    # Also load persisted tasks
    persisted = _load_json(TASKS_FILE, [])
    for t in persisted:
        if t["id"] not in _active_tasks:
            all_tasks.append(t)

    if status:
        all_tasks = [t for t in all_tasks if t.get("status") == status]
    if agent:
        all_tasks = [t for t in all_tasks if t.get("agent") == agent]

    # Sort by priority then created
    prio_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    all_tasks.sort(key=lambda t: (prio_order.get(t.get("priority", "medium"), 5), t.get("created", "")))

    columns = {"pending": [], "running": [], "completed": [], "failed": [], "cancelled": []}
    for t in all_tasks:
        s = t.get("status", "pending")
        if s in columns:
            columns[s].append(t)

    return {
        "tasks": all_tasks,
        "columns": columns,
        "total": len(all_tasks),
        "by_agent": {
            name: len([t for t in all_tasks if t.get("agent") == name])
            for name in ["opencode", "hermes", "gemini", "jcode"]
        },
    }

@app.post("/api/tasks")
def create_task(data: TaskCreate):
    """Create a new task and add to queue."""
    task = {
        "id": str(uuid.uuid4())[:8],
        "title": data.title,
        "description": data.description,
        "agent": data.agent,
        "priority": data.priority,
        "status": "pending",
        "progress": 0,
        "created": get_timestamp(),
        "started": None,
        "completed": None,
        "error": None,
    }
    _task_queue.append(task["id"])
    _active_tasks[task["id"]] = task

    # Persist
    tasks = _load_json(TASKS_FILE, [])
    tasks.insert(0, task)
    if len(tasks) > 200:
        tasks = tasks[:200]
    _save_json(TASKS_FILE, tasks)

    OrchestrationEvent.publish({"type": "task_created", "task": task})
    append_audit({"action": "task_created", "task_id": task["id"], "title": data.title})
    return task

@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    if task_id in _active_tasks:
        return _active_tasks[task_id]
    tasks = _load_json(TASKS_FILE, [])
    for t in tasks:
        if t["id"] == task_id:
            return t
    raise HTTPException(404, "Task not found")

@app.post("/api/tasks/{task_id}/action")
def task_action(task_id: str, data: TaskAction):
    """Execute action on a task: cancel, retry, reroute."""
    task = _active_tasks.get(task_id)
    if not task:
        tasks = _load_json(TASKS_FILE, [])
        for t in tasks:
            if t["id"] == task_id:
                task = t
                break
    if not task:
        raise HTTPException(404, "Task not found")

    action = data.action
    if action == "cancel":
        task["status"] = "cancelled"
        task["completed"] = get_timestamp()
    elif action == "retry":
        task["status"] = "pending"
        task["progress"] = 0
        task["error"] = None
    elif action == "reroute":
        if data.target_agent:
            task["agent"] = data.target_agent
            task["status"] = "pending"
            task["progress"] = 0

    _active_tasks[task["id"]] = task
    OrchestrationEvent.publish({"type": "task_action", "task_id": task_id, "action": action})
    return task

@app.post("/api/tasks/{task_id}/progress")
def update_task_progress(task_id: str, progress: int = 0):
    """Update task progress (0-100)."""
    if task_id in _active_tasks:
        _active_tasks[task_id]["progress"] = min(100, max(0, progress))
        OrchestrationEvent.publish({"type": "task_progress", "task_id": task_id, "progress": progress})
        return _active_tasks[task_id]
    raise HTTPException(404, "Task not found")

# ─── 4. Agent Configuration & Capability Matrix ─────────────────

DEFAULT_AGENT_CONFIGS = {
    "opencode": {
        "name": "opencode",
        "display_name": "OpenCode",
        "icon": "🔧",
        "enabled": True,
        "default_model": "deepseek-v4-pro",
        "provider": "deepseek",
        "rate_limit": 0,
        "capabilities": ["code_generation", "devops", "file_operations", "git", "terraform", "docker", "testing", "scripting"],
        "context_window": 128000,
        "api_key_status": "ok",
        "description": "Code & DevOps — infrastructure, git, file ops, deployment",
    },
    "hermes": {
        "name": "hermes",
        "display_name": "Hermes",
        "icon": "⚡",
        "enabled": True,
        "default_model": "deepseek/deepseek-chat",
        "provider": "openrouter",
        "rate_limit": 0,
        "capabilities": ["memory", "scheduling", "messaging", "skills", "plugins", "backup", "channel_management"],
        "context_window": 128000,
        "api_key_status": "ok",
        "description": "Memory & Scheduling — context, cron jobs, messaging, skill orchestration",
    },
    "gemini": {
        "name": "gemini",
        "display_name": "Gemini CLI",
        "icon": "🧠",
        "enabled": True,
        "default_model": "gemini-2.5-pro",
        "provider": "gemini",
        "rate_limit": 0,
        "capabilities": ["research", "analysis", "document_review", "language_translation", "search", "study"],
        "context_window": 1000000,
        "api_key_status": "ok",
        "description": "Research & Analysis — deep research, document review, language tasks",
    },
    "jcode": {
        "name": "jcode",
        "display_name": "jcode",
        "icon": "⚡",
        "enabled": True,
        "default_model": "deepseek-v4-pro",
        "provider": "deepseek",
        "rate_limit": 0,
        "capabilities": ["javascript", "nodejs", "typescript", "frontend", "react", "vue", "npm", "web_development"],
        "context_window": 128000,
        "api_key_status": "ok",
        "description": "JavaScript & Node.js — JS, TS, frontend, web development",
    },
}

@app.get("/api/agents/config")
def get_agent_configs():
    """Get all agent configurations."""
    config = _load_json(AGENT_CONFIG_FILE, {})
    agents = []
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        default = DEFAULT_AGENT_CONFIGS[name].copy()
        stored = config.get(name, {})
        default.update(stored)
        agents.append(default)
    return {"agents": agents, "updated": get_timestamp()}

@app.get("/api/agents/config/{name}")
def get_agent_config(name: str):
    if name not in ["opencode", "hermes", "gemini", "jcode"]:
        raise HTTPException(400, "Invalid agent")
    config = _load_json(AGENT_CONFIG_FILE, {})
    default = DEFAULT_AGENT_CONFIGS[name].copy()
    default.update(config.get(name, {}))
    return default

@app.put("/api/agents/config/{name}")
def update_agent_config(name: str, data: AgentConfigUpdate):
    if name not in ["opencode", "hermes", "gemini", "jcode"]:
        raise HTTPException(400, "Invalid agent")
    config = _load_json(AGENT_CONFIG_FILE, {})
    config[name] = {
        "enabled": data.enabled,
        "default_model": data.default_model,
        "rate_limit": data.rate_limit,
        "capabilities": data.capabilities,
        "api_key_status": data.api_key_status,
    }
    _save_json(AGENT_CONFIG_FILE, config)
    append_audit({"action": "agent_config_updated", "agent": name})
    return {"status": "updated", "agent": name}

# ─── 5. Conversation & Context Inspector ─────────────────────────

@app.get("/api/conversations")
def list_conversations(agent: str = "", limit: int = 50):
    """Browse recent conversations across agents."""
    history = load_chat_history()
    messages = history.get("messages", [])

    if agent:
        messages = [m for m in messages if m.get("agent") == agent]

    # Group into conversations (sessions)
    conversations = []
    current = None
    for msg in messages[-500:]:
        if msg["role"] == "user":
            if current:
                conversations.append(current)
            current = {"id": msg["id"], "agent": msg.get("agent", ""), "user_message": msg["content"][:100],
                       "timestamp": msg["timestamp"], "messages": [msg], "token_count": len(msg["content"]) // 4}
        elif current:
            current["messages"].append(msg)
            current["token_count"] = current.get("token_count", 0) + len(msg.get("content", "")) // 4
    if current:
        conversations.append(current)

    return {
        "conversations": conversations[-limit:],
        "total": len(conversations),
    }

@app.get("/api/conversations/{conv_id}")
def get_conversation(conv_id: str):
    """Get full conversation context with token breakdown."""
    history = load_chat_history()
    messages = history.get("messages", [])
    conv = []
    found = False
    for msg in messages:
        if msg["id"] == conv_id:
            found = True
        if found:
            conv.append(msg)
            if msg["role"] == "assistant" and msg != conv[0]:
                break

    if not conv:
        raise HTTPException(404, "Conversation not found")

    total_tokens = sum(len(m.get("content", "")) // 4 for m in conv)
    return {
        "conversation": conv,
        "total_tokens": total_tokens,
        "message_count": len(conv),
        "agent": conv[0].get("agent", "") if conv else "",
    }

# ─── 6. Pipeline/Workflow Orchestrator ──────────────────────────

@app.get("/api/workflows")
def list_workflows():
    """List all defined pipelines/workflows."""
    return _load_json(WORKFLOWS_FILE, {"workflows": [], "runs": []})

@app.post("/api/workflows")
def create_workflow(data: WorkflowCreate):
    """Create a new workflow pipeline."""
    workflows = _load_json(WORKFLOWS_FILE, {"workflows": [], "runs": []})
    wf = {
        "id": str(uuid.uuid4())[:8],
        "name": data.name,
        "description": data.description,
        "nodes": data.nodes,
        "enabled": data.enabled,
        "created": get_timestamp(),
        "run_count": 0,
        "last_run": None,
    }
    workflows["workflows"].append(wf)
    _save_json(WORKFLOWS_FILE, workflows)
    append_audit({"action": "workflow_created", "name": data.name})
    return wf

@app.post("/api/workflows/{wf_id}/run")
def run_workflow(wf_id: str):
    """Execute a workflow pipeline."""
    workflows = _load_json(WORKFLOWS_FILE, {"workflows": [], "runs": []})
    wf = None
    for w in workflows["workflows"]:
        if w["id"] == wf_id:
            wf = w
            break
    if not wf:
        raise HTTPException(404, "Workflow not found")

    run_id = str(uuid.uuid4())[:8]
    run = {
        "id": run_id,
        "workflow_id": wf_id,
        "name": wf["name"],
        "status": "running",
        "nodes": {n.get("id", ""): "pending" for n in wf["nodes"]},
        "started": get_timestamp(),
        "completed": None,
    }
    workflows.setdefault("runs", []).append(run)
    if len(workflows["runs"]) > 100:
        workflows["runs"] = workflows["runs"][-100:]
    wf["run_count"] += 1
    wf["last_run"] = get_timestamp()
    _save_json(WORKFLOWS_FILE, workflows)

    OrchestrationEvent.publish({"type": "workflow_started", "workflow": wf["name"], "run_id": run_id})
    append_audit({"action": "workflow_run", "name": wf["name"], "run_id": run_id})
    return {"status": "started", "run": run}

@app.post("/api/workflows/{wf_id}/runs/{run_id}/node")
def update_workflow_node(wf_id: str, run_id: str, node_id: str = "", status: str = "completed"):
    """Update a workflow node status."""
    workflows = _load_json(WORKFLOWS_FILE, {"workflows": [], "runs": []})
    for run in workflows.get("runs", []):
        if run["id"] == run_id:
            run["nodes"][node_id] = status
            if all(s == "completed" for s in run["nodes"].values()):
                run["status"] = "completed"
                run["completed"] = get_timestamp()
            elif any(s == "failed" for s in run["nodes"].values()):
                run["status"] = "failed"
                run["completed"] = get_timestamp()
            _save_json(WORKFLOWS_FILE, workflows)
            return {"status": "updated", "run_status": run["status"]}
    raise HTTPException(404, "Run not found")

@app.delete("/api/workflows/{wf_id}")
def delete_workflow(wf_id: str):
    workflows = _load_json(WORKFLOWS_FILE, {"workflows": [], "runs": []})
    workflows["workflows"] = [w for w in workflows["workflows"] if w["id"] != wf_id]
    _save_json(WORKFLOWS_FILE, workflows)
    return {"status": "deleted"}

# ─── 7. Enhanced Cost & Token Analytics ─────────────────────────

@app.get("/api/analytics/cost-summary")
def get_cost_summary():
    """Enhanced cost summary with per-agent breakdown."""
    cost_data = _load_json(BASE_DIR / "data" / "cost-history.json", {"entries": [], "daily_totals": {}, "monthly_projection": 0, "free_tier_alerts": []})
    entries = cost_data.get("entries", [])

    per_agent = {}
    per_model = {}
    total_cost = 0
    total_tokens = 0
    today = get_timestamp()[:10]
    today_cost = 0

    for e in entries:
        agent = e.get("agent", "unknown")
        model = e.get("model", "unknown")
        cost = e.get("cost", 0.0)
        tokens = e.get("tokens", 0)

        total_cost += cost
        total_tokens += tokens
        if e.get("timestamp", "").startswith(today):
            today_cost += cost

        per_agent[agent] = per_agent.get(agent, 0) + cost
        per_model[model] = per_model.get(model, 0) + cost

    # Last 7 days
    dates = []
    for i in range(6, -1, -1):
        from datetime import timedelta
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        dates.append(d)

    daily = []
    for d in dates:
        day_cost = sum(e.get("cost", 0) for e in entries if e.get("timestamp", "").startswith(d))
        day_tokens = sum(e.get("tokens", 0) for e in entries if e.get("timestamp", "").startswith(d))
        daily.append({"date": d, "cost": round(day_cost, 6), "tokens": day_tokens})

    return {
        "total_cost": round(total_cost, 6),
        "total_tokens": total_tokens,
        "today_cost": round(today_cost, 6),
        "per_agent": per_agent,
        "per_model": per_model,
        "daily": daily,
        "entry_count": len(entries),
        "alerts": cost_data.get("free_tier_alerts", []),
        "monthly_projection": cost_data.get("monthly_projection", 0),
    }

@app.get("/api/analytics/token-usage")
def get_token_usage():
    """Real-time token usage per agent."""
    metrics = _load_json(METRICS_FILE, {"agents": {}, "history": []})
    usage = {}
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        runs = metrics.get("agents", {}).get(name, {}).get("runs", [])
        total = sum(r.get("tokens_used", 0) for r in runs)
        today = sum(r.get("tokens_used", 0) for r in runs if r.get("timestamp", "").startswith(get_timestamp()[:10]))
        usage[name] = {"total": total, "today": today}
    return {"usage": usage, "updated": get_timestamp()}

# ─── 8. Alerting & Notification Center ──────────────────────────

@app.get("/api/alerts/rules")
def get_alert_rules():
    """Get all alert rules."""
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    return {"rules": alerts.get("rules", []), "history": alerts.get("history", [])[-50:]}

@app.post("/api/alerts/rules")
def create_alert_rule(data: AlertRule):
    """Create an alert rule."""
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    rule = {
        "id": str(uuid.uuid4())[:8],
        "name": data.name,
        "type": data.type,
        "threshold": data.threshold,
        "agent": data.agent,
        "enabled": data.enabled,
        "channels": data.channels,
        "created": get_timestamp(),
        "last_triggered": None,
        "trigger_count": 0,
    }
    alerts["rules"].append(rule)
    _save_json(ALERTS_FILE, alerts)
    return rule

@app.put("/api/alerts/rules/{rule_id}")
def update_alert_rule(rule_id: str, data: dict):
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    for rule in alerts["rules"]:
        if rule["id"] == rule_id:
            rule.update(data)
            _save_json(ALERTS_FILE, alerts)
            return rule
    raise HTTPException(404, "Rule not found")

@app.delete("/api/alerts/rules/{rule_id}")
def delete_alert_rule(rule_id: str):
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    alerts["rules"] = [r for r in alerts["rules"] if r["id"] != rule_id]
    _save_json(ALERTS_FILE, alerts)
    return {"status": "deleted"}

@app.post("/api/alerts/test")
def test_alert():
    """Test the alerting system."""
    alert = {
        "id": str(uuid.uuid4())[:8],
        "type": "test",
        "message": "This is a test alert from Agentic OS",
        "severity": "info",
        "timestamp": get_timestamp(),
    }
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    alerts["history"].append(alert)
    _save_json(ALERTS_FILE, alerts)
    OrchestrationEvent.publish({"type": "alert", "alert": alert})
    return {"status": "sent", "alert": alert}

@app.get("/api/alerts/unread")
def get_unread_alerts():
    """Get unread alert count."""
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    unread = [a for a in alerts.get("history", []) if a.get("read") != True]
    return {"count": len(unread), "alerts": unread}

@app.post("/api/alerts/read-all")
def mark_alerts_read():
    alerts = _load_json(ALERTS_FILE, {"rules": [], "history": []})
    for a in alerts.get("history", []):
        a["read"] = True
    _save_json(ALERTS_FILE, alerts)
    return {"status": "marked"}

# ─── 9. System Health & Resource Monitoring ─────────────────────

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

@app.get("/api/system/health")
def get_system_health():
    """System resource monitoring."""
    info = {
        "timestamp": get_timestamp(),
        "has_psutil": HAS_PSUTIL,
    }
    if HAS_PSUTIL:
        info["cpu"] = {
            "percent": psutil.cpu_percent(interval=0.1),
            "cores": psutil.cpu_count(),
            "load_avg": list(psutil.getloadavg()) if hasattr(psutil, "getloadavg") else [],
        }
        mem = psutil.virtual_memory()
        info["memory"] = {
            "total_gb": round(mem.total / (1024**3), 1),
            "used_gb": round(mem.used / (1024**3), 1),
            "available_gb": round(mem.available / (1024**3), 1),
            "percent": mem.percent,
        }
        disk = psutil.disk_usage("/")
        info["disk"] = {
            "total_gb": round(disk.total / (1024**3), 1),
            "used_gb": round(disk.used / (1024**3), 1),
            "free_gb": round(disk.free / (1024**3), 1),
            "percent": disk.percent,
        }
        net = psutil.net_io_counters()
        info["network"] = {
            "sent_mb": round(net.bytes_sent / (1024**2), 1),
            "recv_mb": round(net.bytes_recv / (1024**2), 1),
        }
        # Process info
        try:
            proc = psutil.Process()
            info["process"] = {
                "pid": proc.pid,
                "memory_mb": round(proc.memory_info().rss / (1024**2), 1),
                "cpu_percent": proc.cpu_percent(interval=0.1),
                "threads": proc.num_threads(),
                "uptime_seconds": int(time.time() - proc.create_time()),
            }
        except:
            pass
    else:
        info["note"] = "Install psutil for full system metrics: pip install psutil"

    return info

@app.get("/api/system/health/history")
def get_system_health_history(limit: int = 100):
    """Historical system health data."""
    hf = BASE_DIR / "data" / "system-health.json"
    if not hf.exists():
        return {"history": [], "note": "No historical data. Enable periodic collection."}
    history = _load_json(hf, [])
    return {"history": history[-limit:], "total": len(history)}

# ─── 10. Agent A/B Testing & Comparison ─────────────────────────

@app.post("/api/comparison")
def run_comparison(data: ComparisonRequest):
    """Run side-by-side agent comparison on the same prompt."""
    results = {}
    for agent in data.agents:
        if agent not in ["opencode", "hermes", "gemini", "jcode"]:
            continue
        try:
            response = execute_agent(agent, data.prompt)
            results[agent] = {
                "response": response[:2000],
                "response_length": len(response),
                "tokens_approx": len(response) // 4,
                "success": not response.startswith("⚠"),
            }
        except Exception as e:
            results[agent] = {"response": str(e), "error": True, "success": False}

    comparison = {
        "id": str(uuid.uuid4())[:8],
        "prompt": data.prompt[:200],
        "agents": data.agents,
        "results": results,
        "timestamp": get_timestamp(),
    }

    # Save history
    comps = _load_json(COMPARISONS_FILE, [])
    comps.append(comparison)
    if len(comps) > 50:
        comps = comps[-50:]
    _save_json(COMPARISONS_FILE, comps)

    return comparison

@app.get("/api/comparison/history")
def get_comparison_history():
    """Get past comparison results."""
    return _load_json(COMPARISONS_FILE, [])

# ─── Scheduled Reports & Email Digest ──────────────────────────

REPORTS_FILE = BASE_DIR / "data" / "reports.json"

class ReportSchedule(BaseModel):
    name: str
    frequency: str = "daily"  # daily, weekly, monthly
    recipients: str = ""  # comma-separated emails
    include_sections: list = ["summary", "agents", "cost", "errors"]
    enabled: bool = True

@app.get("/api/reports/config")
def get_report_configs():
    return _load_json(REPORTS_FILE, {"schedules": [], "history": []})

@app.post("/api/reports/schedule")
def schedule_report(data: ReportSchedule):
    reports = _load_json(REPORTS_FILE, {"schedules": [], "history": []})
    schedule = {
        "id": str(uuid.uuid4())[:8],
        "name": data.name,
        "frequency": data.frequency,
        "recipients": data.recipients,
        "include_sections": data.include_sections,
        "enabled": data.enabled,
        "created": get_timestamp(),
        "last_sent": None,
        "sent_count": 0,
    }
    reports["schedules"].append(schedule)
    _save_json(REPORTS_FILE, reports)
    return schedule

@app.delete("/api/reports/schedule/{schedule_id}")
def delete_report_schedule(schedule_id: str):
    reports = _load_json(REPORTS_FILE, {"schedules": [], "history": []})
    reports["schedules"] = [s for s in reports["schedules"] if s["id"] != schedule_id]
    _save_json(REPORTS_FILE, reports)
    return {"status": "deleted"}

@app.post("/api/reports/generate")
def generate_report():
    """Generate a summary report of current system state."""
    # Gather all data
    status = {"agents": [check_agent(a) for a in ["opencode", "hermes", "gemini", "jcode"]]}
    metrics = _load_json(METRICS_FILE, {"agents": {}, "history": []})
    cost_data = _load_json(BASE_DIR / "data" / "cost-history.json", {"entries": []})
    tasks_data = _load_json(TASKS_FILE, [])
    errors_data = json.loads(ERROR_LOG_FILE.read_text()) if ERROR_LOG_FILE.exists() else []
    alerts_data = _load_json(ALERTS_FILE, {"rules": [], "history": []})

    # Agent summary
    agent_summary = {}
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        runs = metrics.get("agents", {}).get(name, {}).get("runs", [])
        today_runs = [r for r in runs if r.get("timestamp", "").startswith(get_timestamp()[:10])]
        agent_summary[name] = {
            "status": check_agent(name)["status"],
            "total_runs": len(runs),
            "today_runs": len(today_runs),
            "success_rate": round(sum(1 for r in runs if r.get("success", True)) / len(runs) * 100, 1) if runs else 100,
            "total_tokens": sum(r.get("tokens_used", 0) for r in runs),
            "total_cost": round(sum(r.get("cost", 0) for r in runs), 6),
        }

    # Cost summary
    entries = cost_data.get("entries", [])
    today_cost = sum(e.get("cost", 0) for e in entries if e.get("timestamp", "").startswith(get_timestamp()[:10]))
    total_cost = sum(e.get("cost", 0) for e in entries)

    # Task summary
    task_statuses = {"pending": 0, "running": 0, "completed": 0, "failed": 0}
    for t in tasks_data:
        s = t.get("status", "pending")
        task_statuses[s] = task_statuses.get(s, 0) + 1

    # Error summary
    recent_errors = errors_data[-10:] if errors_data else []

    report = {
        "id": str(uuid.uuid4())[:8],
        "generated": get_timestamp(),
        "title": f"Agentic OS Report — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        "summary": {
            "agents_online": sum(1 for a in status["agents"] if a["status"] == "online"),
            "agents_total": len(status["agents"]),
            "active_tasks": task_statuses.get("running", 0),
            "today_cost": round(today_cost, 6),
            "total_cost": round(total_cost, 6),
            "unread_alerts": len([a for a in alerts_data.get("history", []) if not a.get("read")]),
        },
        "agents": agent_summary,
        "tasks": task_statuses,
        "cost": {"today": round(today_cost, 6), "total": round(total_cost, 6)},
        "errors": [{"message": e.get("message", "")[:100], "category": e.get("category", "")} for e in recent_errors],
        "top_skills": [],  # populated below
    }

    # Top skills
    skills_dir = BASE_DIR / "skills"
    skill_runs = []
    for d in skills_dir.iterdir():
        if d.is_dir() and not d.name.startswith("_"):
            score_path = d / "score-history.json"
            scores = json.loads(score_path.read_text()) if score_path.exists() else []
            if scores:
                skill_runs.append({"name": d.name, "runs": len(scores), "avg_score": round(sum(s.get("score", 0) for s in scores) / len(scores), 2)})
    report["top_skills"] = sorted(skill_runs, key=lambda x: x["runs"], reverse=True)[:5]

    # Save history
    reports = _load_json(REPORTS_FILE, {"schedules": [], "history": []})
    reports.setdefault("history", []).append(report)
    if len(reports["history"]) > 50:
        reports["history"] = reports["history"][-50:]
    _save_json(REPORTS_FILE, reports)

    return report

@app.post("/api/reports/send/{schedule_id}")
def send_report(schedule_id: str):
    """Trigger sending a scheduled report."""
    reports = _load_json(REPORTS_FILE, {"schedules": [], "history": []})
    schedule = None
    for s in reports.get("schedules", []):
        if s["id"] == schedule_id:
            schedule = s
            break
    if not schedule:
        raise HTTPException(404, "Schedule not found")

    # Generate report
    report = generate_report()
    schedule["last_sent"] = get_timestamp()
    schedule["sent_count"] = schedule.get("sent_count", 0) + 1

    recipients = [r.strip() for r in schedule.get("recipients", "").split(",") if r.strip()]
    _save_json(REPORTS_FILE, reports)

    # Build markdown
    md = f"""# {report['title']}

## Summary
- 🟢 Agents: **{report['summary']['agents_online']}/{report['summary']['agents_total']}** online
- 📋 Tasks: **{report['summary']['active_tasks']}** active
- 💰 Cost today: **${report['summary']['today_cost']:.4f}**
- 🔔 Alerts: **{report['summary']['unread_alerts']}** unread

## Agent Performance
"""
    for name, a in report["agents"].items():
        md += f"- **{name}**: {a['status']} | {a['today_runs']} runs today | {a['success_rate']}% success | ${a['total_cost']:.4f}\n"

    md += f"\n## Tasks\n- Pending: {report['tasks'].get('pending', 0)}\n- Running: {report['tasks'].get('running', 0)}\n- Completed: {report['tasks'].get('completed', 0)}\n- Failed: {report['tasks'].get('failed', 0)}\n"

    if report["top_skills"]:
        md += "\n## Top Skills\n"
        for sk in report["top_skills"]:
            md += f"- {sk['name']}: {sk['runs']} runs, avg score {sk['avg_score']}\n"

    if report["errors"]:
        md += f"\n## Recent Errors ({len(report['errors'])})\n"
        for e in report["errors"][:5]:
            md += f"- [{e['category']}] {e['message']}\n"

    append_audit({"action": "report_sent", "schedule": schedule["name"], "recipients": recipients})
    return {"status": "sent", "report": report, "markdown": md, "recipients": recipients}


# ─── 3. Global Search ─────────────────────────────────────────────

@app.get("/api/search")
def global_search(q: str = Query(""), limit: int = Query(20, le=50)):
    """Search across all data sources."""
    if not q or len(q) < 2:
        return {"query": q, "results": [], "total": 0}

    ql = q.lower()
    results = []

    # Search conversations
    chat = load_chat_history()
    for msg in chat.get("messages", []):
        if ql in (msg.get("content", "") or "").lower():
            results.append({
                "source": "conversation",
                "title": (msg.get("content", "") or "")[:80],
                "preview": (msg.get("content", "") or "")[:150],
                "agent": msg.get("agent", ""),
                "timestamp": msg.get("timestamp", ""),
                "link": f"#conversation-inspector",
            })

    # Search tasks
    tasks = list(_active_tasks.values())
    for t in _load_json(TASKS_FILE, []):
        if t["id"] not in _active_tasks:
            tasks.append(t)
    for t in tasks:
        if ql in (t.get("title", "") + t.get("description", "")).lower():
            results.append({
                "source": "task",
                "title": t.get("title", ""),
                "preview": (t.get("description", "") or t.get("title", ""))[:150],
                "status": t.get("status", ""),
                "agent": t.get("agent", ""),
                "timestamp": t.get("created", ""),
                "link": f"#task-queue",
            })

    # Search skills
    for d in sorted((BASE_DIR / "skills").iterdir()):
        if d.is_dir() and not d.name.startswith("_"):
            skill_md = read_file(d / "SKILL.md")
            learnings = read_file(d / "learnings.md")
            if ql in d.name or ql in skill_md.lower() or ql in learnings.lower():
                results.append({
                    "source": "skill",
                    "title": d.name,
                    "preview": skill_md[:150] if skill_md else "",
                    "timestamp": "",
                    "link": f"#skills",
                })

    # Search audit
    for e in (api_get_audit_entries())[-200:]:
        entry_text = json.dumps(e).lower()
        if ql in entry_text:
            results.append({
                "source": "audit",
                "title": e.get("action", ""),
                "preview": f"{e.get('skill', '')} {e.get('agent', '')} #{e.get('run_id', '')}".strip()[:150],
                "timestamp": e.get("timestamp", ""),
                "link": "#audit",
            })

    # Search brain/memory
    brain_dir = BASE_DIR / "brain"
    if brain_dir.exists():
        for f in brain_dir.glob("*.md"):
            content = read_file(f)
            if ql in f.name.lower() or ql in content.lower():
                results.append({
                    "source": "memory",
                    "title": f.name.replace(".md", ""),
                    "preview": content[:150],
                    "timestamp": "",
                    "link": "#memory",
                })

    # Sort by recency, deduplicate loosely
    results.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
    total = len(results)
    results = results[:limit]

    return {
        "query": q,
        "results": results,
        "total": total,
        "by_source": {
            src: len([r for r in results if r["source"] == src])
            for src in ["conversation", "task", "skill", "audit", "memory"]
            if any(r["source"] == src for r in results)
        },
    }

def api_get_audit_entries():
    audit_file = BASE_DIR / "audit" / "audit.log"
    if not audit_file.exists():
        return []
    return [json.loads(l) for l in audit_file.read_text().strip().split("\n") if l.strip()]

# ─── 4. Auto-Mode: Agent Self-Scheduling ────────────────────────

AGENT_CAPABILITIES = {
    "opencode": ["code", "devops", "deploy", "git", "file", "terraform", "docker", "test", "build", "infra", "script", "api"],
    "hermes": ["memory", "schedule", "channel", "skill", "cron", "reminder", "brain", "plugin", "backup", "orchestrate"],
    "gemini": ["research", "analyze", "search", "compare", "explain", "study", "learn", "document", "report", "review"],
    "jcode": ["javascript", "node", "js", "script", "npm", "frontend", "react", "vue", "typescript", "web", "api"],
}

@app.post("/api/tasks/auto-route")
def auto_route_task(data: TaskCreate):
    """Auto-assign a task to the best agent based on capabilities and load."""
    task_text = (data.title + " " + data.description).lower()

    # Score each agent
    scores = {}
    for agent, keywords in AGENT_CAPABILITIES.items():
        score = sum(1 for k in keywords if k in task_text)
        # Bonus for explicit agent mention
        if agent in task_text:
            score += 3
        scores[agent] = score

    # Adjust for current load
    for name in ["opencode", "hermes", "gemini", "jcode"]:
        active = len([t for t in _active_tasks.values() if t.get("agent") == name and t.get("status") == "running"])
        scores[name] = scores.get(name, 0) - (active * 0.5)

    best = max(scores, key=scores.get)
    confidence = "high" if scores[best] >= 2 else "medium" if scores[best] >= 1 else "low"

    # Create task assigned to best agent
    task = {
        "id": str(uuid.uuid4())[:8],
        "title": data.title,
        "description": data.description,
        "agent": best,
        "priority": data.priority,
        "status": "pending",
        "progress": 0,
        "created": get_timestamp(),
        "started": None,
        "completed": None,
        "error": None,
        "auto_routed": True,
        "routing_scores": scores,
        "routing_confidence": confidence,
    }
    _task_queue.append(task["id"])
    _active_tasks[task["id"]] = task

    tasks = _load_json(TASKS_FILE, [])
    tasks.insert(0, task)
    if len(tasks) > 200:
        tasks = tasks[:200]
    _save_json(TASKS_FILE, tasks)

    OrchestrationEvent.publish({"type": "task_auto_routed", "task": task, "best_agent": best, "confidence": confidence})
    append_audit({"action": "task_auto_routed", "task_id": task["id"], "agent": best, "confidence": confidence})

    return {
        "task": task,
        "routed_to": best,
        "confidence": confidence,
        "all_scores": {k: round(v, 1) for k, v in scores.items()},
    }


# ─── Main ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)
