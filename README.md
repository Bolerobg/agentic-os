# Agentic OS

A multi-agent orchestration platform that coordinates **opencode**, **Hermes Agent**, and **Gemini CLI** into a unified, self-improving, autonomous work operating system.

## Quick Start

```bash
chmod +x install.sh && ./install.sh
```

## Architecture

3 agents + 7 layers + web dashboard:

| Agent | Role |
|-------|------|
| **opencode** | Code generation, DevOps, file operations |
| **Hermes Agent** | Memory, scheduling, channels |
| **Gemini CLI** | Research, analysis, multi-modal |

## Features

- 51 features from top agentic OS implementations
- 10 extra features (cost analytics, git versioning, backup, prompts, etc.)
- Interactive web dashboard (FastAPI + SPA)
- One-click skill execution
- Scheduled workflows
- Persistent memory across sessions
- Self-improving skills with eval scoring
- Multi-agent routing and handoff
- Cost tracking with free-tier alerts

## Dashboard

```bash
./start.sh
# Visit http://127.0.0.1:8080
```

## License

MIT
