#!/usr/bin/env python3
"""Agentic OS — Event-Driven Scheduler Engine

File watcher + cron-based scheduler with execution history.
Handles job reloading, webhook triggers, skill execution events.
"""
import json
import os
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Callable

BASE_DIR = Path(__file__).parent.resolve()
JOBS_DIR = BASE_DIR / "jobs"
HISTORY_FILE = BASE_DIR.parent / "data" / "scheduler-history.json"

_event_listeners = []
_on_files_changed = []

def on_event(listener: Callable):
    _event_listeners.append(listener)
    return listener

def on_files_changed(cb: Callable):
    _on_files_changed.append(cb)
    return cb

def emit_event(event: dict):
    event["timestamp"] = datetime.now(timezone.utc).isoformat()
    event["id"] = str(uuid.uuid4())[:8]
    for listener in _event_listeners:
        try:
            listener(event)
        except Exception:
            pass
    _save_history(event)

def _save_history(event: dict):
    history = []
    if HISTORY_FILE.exists():
        history = json.loads(HISTORY_FILE.read_text())
    history.append(event)
    if len(history) > 1000:
        history = history[-1000:]
    HISTORY_FILE.write_text(json.dumps(history, indent=2))

def get_history(limit: int = 100) -> list:
    if not HISTORY_FILE.exists():
        return []
    history = json.loads(HISTORY_FILE.read_text())
    return history[-limit:]

def load_job_definitions() -> list:
    jobs = []
    for f in sorted(JOBS_DIR.glob("*.json")):
        data = json.loads(f.read_text())
        data["_file"] = str(f)
        jobs.append(data)
    return jobs

def get_job_by_id(job_id: str) -> Optional[dict]:
    for job in load_job_definitions():
        if job.get("id") == job_id:
            return job
    return None

def get_job_by_name(name: str) -> Optional[dict]:
    for job in load_job_definitions():
        if job.get("name") == name:
            return job
    return None

def run_skill(skill_name: str, trigger: str = "scheduler", input_text: str = ""):
    """Execute a skill via the LLM API."""
    import sys
    sys.path.insert(0, str(BASE_DIR.parent))
    from server import BASE_DIR as SERVER_DIR, call_llm, read_file as srv_read_file, get_timestamp as srv_timestamp, append_audit as srv_audit

    audit_file = BASE_DIR.parent / "audit" / "audit.log"
    timestamp = datetime.now(timezone.utc).isoformat()

    # Read skill definition
    skill_dir = SERVER_DIR / "skills" / skill_name
    skill_md = ""
    learnings = ""
    if skill_dir.exists():
        skill_md = (skill_dir / "SKILL.md").read_text() if (skill_dir / "SKILL.md").exists() else ""
        learnings = (skill_dir / "learnings.md").read_text() if (skill_dir / "learnings.md").exists() else ""

    # Build prompt
    system = f"""You are executing the '{skill_name}' skill in Agentic OS.

SKILL INSTRUCTIONS:
{skill_md[:3000]}

PAST LEARNINGS:
{learnings[:1500] if learnings else '(none)'}

Execute the task below following the skill instructions. Be thorough and practical."""

    user = input_text if input_text else f"Execute the {skill_name} skill with default parameters. Provide a complete result."

    # Execute via LLM
    try:
        result = call_llm([
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ])
        status = "completed"
    except Exception as e:
        result = f"Error executing skill: {e}"
        status = "failed"

    # Save to learnings
    if skill_dir.exists():
        existing = learnings
        new_entry = f"\n## {timestamp[:10]} (Scheduled by {trigger})\n- Input: {input_text or '(default)'}\n- Result: {result[:500]}\n"
        (skill_dir / "learnings.md").write_text(existing + new_entry)

    # Audit log
    audit_entry = {
        "action": "scheduler_run",
        "skill": skill_name,
        "trigger": trigger,
        "status": status,
        "result_preview": result[:100],
        "timestamp": timestamp,
    }
    with open(audit_file, "a") as f:
        f.write(json.dumps(audit_entry) + "\n")

    emit_event({
        "type": "skill_run",
        "skill": skill_name,
        "trigger": trigger,
        "status": status,
    })

    print(f"[{timestamp}] Skill '{skill_name}' -> {status} (trigger: {trigger})")
    return {"status": status, "skill": skill_name, "trigger": trigger, "result": result[:200]}


# ─── File Watcher ─────────────────────────────────────────────

class JobFileWatcher:
    """Watch scheduler/jobs/ for changes and notify listeners."""
    def __init__(self, interval: float = 2.0):
        self.interval = interval
        self._known = {}
        self._running = False
        self._thread = None

    def start(self):
        self._running = True
        self._scan()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def stop(self):
        self._running = False

    def _scan(self):
        current = {}
        for f in JOBS_DIR.glob("*.json"):
            try:
                mtime = f.stat().st_mtime
                current[str(f)] = mtime
            except OSError:
                pass
        if self._known and current != self._known:
            for cb in _on_files_changed:
                try:
                    cb()
                except Exception:
                    pass
        self._known = current

    def _loop(self):
        while self._running:
            time.sleep(self.interval)
            self._scan()


# ─── Cron Scheduler ────────────────────────────────────────────

class CronScheduler:
    """Simple in-process cron scheduler using APScheduler."""
    def __init__(self):
        self._scheduler = None
        self._watcher = JobFileWatcher()

    def start(self):
        try:
            from apscheduler.schedulers.background import BackgroundScheduler as BS
            from apscheduler.triggers.cron import CronTrigger as CT
        except ImportError:
            print("Install APScheduler: pip install apscheduler")
            return
        self._scheduler = BS()
        self._reload_jobs()
        self._scheduler.start()
        self._watcher.start()
        _on_files_changed.append(self._reload_jobs)
        print(f"Agentic OS Scheduler running. Jobs loaded from: {JOBS_DIR}")

    def stop(self):
        self._watcher.stop()
        if self._scheduler:
            self._scheduler.shutdown(wait=False)

    def _reload_jobs(self):
        if not self._scheduler:
            return
        from apscheduler.triggers.cron import CronTrigger as CT
        for job in self._scheduler.get_jobs():
            job.remove()
        for data in load_job_definitions():
            if not data.get("enabled", True):
                continue
            try:
                self._scheduler.add_job(
                    run_skill,
                    CT.from_crontab(data["cron"]),
                    args=[data["skill"], "cron"],
                    id=data.get("id", data["name"]),
                    name=data["name"],
                    replace_existing=True,
                    misfire_grace_time=60,
                )
            except Exception as e:
                print(f"  Failed to schedule {data.get('name')}: {e}")
        count = len(self._scheduler.get_jobs())
        print(f"  Scheduled {count} jobs")


# ─── Standalone Entry ─────────────────────────────────────────

def main():
    scheduler = CronScheduler()
    scheduler.start()
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        scheduler.stop()
        print("Scheduler stopped.")

if __name__ == "__main__":
    main()
