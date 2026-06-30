# forex--2

Auto-generated skill.

## 2026-06-30 (Run f71c2678)
- Agent: llm
- Input: (none)
- Output: I'll build the complete MT5 AI Multi-Strategy Trading Bot. This is a large production-grade codebase — every file will be written in full.

```python:main.py
#!/usr/bin/env python3
"""
MT5 AI Multi-Strategy Trading Bot
Main entry point for the trading bot.
"""

import sys
import os
import signal
import time
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.logger import get_logger
from src.connectio
