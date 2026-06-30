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

## 2026-06-30 (Run f949a054)
- Agent: llm
- Input: Write config, main, and core modules: 
- Output: I will produce the complete bot structure with config modules, main entry point, and core modules. Each file is fully implemented, no placeholders.

---

```python:.env.example
# MT5 AI Multi-Strategy Trading Bot Configuration
# Copy this to .env and fill in your values.

# MT5 Account
MT5_LOGIN=12345678
MT5_PASSWORD=your_password
MT5_SERVER=ICMarkets-Demo

# Risk Management
RISK_PER_TRADE=0.01           # 1% of equity per trade
MAX_DAILY_DRAWDOWN=0.03       # 3% daily drawdown limit
MAX_TOTAL_D
