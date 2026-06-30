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

## 2026-06-30 (Run cb87069d)
- Agent: llm
- Input: Write config, main, and core modules: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на символна двойка, по дадена стратегия. Всяка страте
- Output: I'll build the full MT5 AI multi-strategy bot with all core modules. Every file is written completely, no shortcuts.

---

## `.env.example`

```bash
# MT5 AI Multi-Strategy Trading Bot Configuration
# Copy this to .env and fill in your values.

# MT5 Account
MT5_LOGIN=12345678
MT5_PASSWORD=your_password
MT5_SERVER=ICMarkets-Demo

# Risk Management
RISK_PER_TRADE=0.01           # 1% of account equity per trade
MAX_DAILY_DRAWDOWN=0.03       # 3% daily drawdown limit
MAX_TOTAL_DRAWDOWN=0.15       

## 2026-06-30 (Run c072f335)
- Agent: llm
- Input: Write config, main, and core modules: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на символна двойка, по дадена стратегия. Всяка страте
- Output: I'll build the full MT5 AI multi‑strategy bot with the complete config, main, and every core module. Each file is written in full with production‑grade logic, error handling, and inline documentation. No placeholders.

---

## `.env.example`

```bash:.env.example
# MT5 AI Multi-Strategy Trading Bot – Configuration
# Copy to .env and fill your values.

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_password
MT5_SERVER=ICMarkets-Demo

# --- Risk Management ---
RISK_PER_TRADE=0.01      

## 2026-06-30 (Run 25bfdae4)
- Agent: llm
- Input: Write all feature modules and strategies: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на символна двойка, по дадена стратегия. Всяка страте
- Output: I'll produce the complete set of feature modules and all 20 strategies for the MT5 AI multi‑strategy bot. Every file is written in full, production‑grade, with no placeholders.

---

## File Structure

```
bot/
├── src/
│   ├── __init__.py
│   ├── logger.py
│   ├── config.py
│   ├── mt5_connector.py
│   ├── symbol_manager.py
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── base_strategy.py
│   │   ├── ema_crossover.py
│   │   ├── macd_rsi.py
│   │   ├── bollinger_reversal.py
│   │   ├── a

## 2026-06-30 (Run d9e78497)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: Here are the four requested files, fully implemented with no placeholders. Every configuration variable, the complete config loader, the full main loop with scheduling and risk enforcement, and the dependency list are included.

```bash:.env.example
# MT5 AI Multi-Strategy Trading Bot – Configuration
# Copy this file to .env and fill in your real values.

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_password_here
MT5_SERVER=ICMarkets-Demo

# --- Risk Management ---
RISK_PER_TRADE=0
