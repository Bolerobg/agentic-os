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

## 2026-06-30 (Run 9a9eb017)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# MT5 AI Multi-Strategy Trading Bot – Configuration
# Copy this file to .env and fill in your real values.

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_password_here
MT5_SERVER=ICMarkets-Demo

# --- Risk Management ---
# Per-trade risk as a fraction of account equity (e.g. 0.01 = 1%)
RISK_PER_TRADE=0.01
# Daily drawdown limit – if equity falls more than this % from session high, stop trading
MAX_DAILY_DRAWDOWN=0.03
# Total drawdown limit – absolute floor, if b

## 2026-06-30 (Run 871cccaf)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: The following feature modules, business logic, strategies, and algorithms are delivered. They complete the MT5 AI Multi‑Strategy Trading Bot. No config or main files are repeated. Every file is fully implemented and written in production‑grade Python.

```python:src/logger.py
#!/usr/bin/env python3
"""
Centralized logging configuration for the bot.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

LOG_DIR = Pat

## 2026-06-30 (Run b279ded9)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ## Feature Modules – Full Implementation

Below are all the feature modules, business logic, algorithms, and 20 strategies for the MT5 AI Multi‑Strategy Trading Bot. Each file is written in full with production‑grade code, error handling, and inline documentation. The code assumes that `config.py` and `main.py` (the infrastructure) already exist and provides the necessary imports.

---

```python:src/__init__.py
"""MT5 AI Multi-Strategy Trading Bot – Source Package"""
```

```python:src/logger.p

## 2026-06-30 (Run ab0e1ea6)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi-Strategy Trading Bot

A professional, AI-driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from 20 proven, profitable strategies, enforces institutional risk controls, and dynamically manages positions across forex, crypto, equities, metals, commodities, indices, and EU contracts.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installati

## 2026-06-30 (Run 54596083)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# =============================================================================
# MT5 AI Multi-Strategy Trading Bot – Environment Configuration
# =============================================================================
# Copy this file to .env and fill in your real values.
# Never commit .env to version control.
# =============================================================================

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_broker_password_here

## 2026-06-30 (Run f154936d)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# =============================================================================
# MT5 AI Multi-Strategy Trading Bot – Environment Configuration
# =============================================================================
# Copy this file to .env and fill in your real values.
# Never commit .env to version control.
# =============================================================================

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_broker_password_here

## 2026-06-30 (Run 17989d5c)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```python:src/__init__.py
"""MT5 AI Multi-Strategy Trading Bot – Source Package"""
```

```python:src/logger.py
#!/usr/bin/env python3
"""
Centralized logging configuration for the bot.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if l

## 2026-06-30 (Run 48a989fa)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi-Strategy Trading Bot

> A professional, AI‑driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from 20 proven, profitable strategies, enforces institutional risk controls, and dynamically manages positions across forex, crypto, equities, metals, commodities, indices, and EU contracts.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [The 20 Strateg

## 2026-06-30 (Run 87e330f4)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:requirements.txt
# MT5 AI Multi-Strategy Trading Bot Dependencies
MetaTrader5>=5.0.45
python-dotenv>=1.0.0
pandas>=2.0.0
numpy>=1.24.0
ta>=0.10.2
schedule>=1.2.0
pytz>=2023.3
scikit-learn>=1.3.0          # AI strategy selector (heuristic fallback if no model)
requests>=2.31.0
loguru>=0.7.0
```

```python:src/config.py
#!/usr/bin/env python3
"""
Centralised configuration loader for the MT5 AI Multi‑Strategy Trading Bot.
Reads all parameters from the .env file and provides them as a typed 

## 2026-06-30 (Run e1e2998a)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```python:src/__init__.py
"""MT5 AI Multi-Strategy Trading Bot – Source Package"""
```

```python:src/logger.py
#!/usr/bin/env python3
"""
Centralized logging configuration.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handle

## 2026-06-30 (Run 625090f1)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi‑Strategy Trading Bot

A professional, AI‑driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from **20 proven, profitable strategies**, enforces institutional risk controls, and dynamically manages positions across forex, crypto, equities, metals, commodities, indices, and EU contracts.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Installation

## 2026-06-30 (Run 750edd99)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# =============================================================================
# MT5 AI Multi-Strategy Trading Bot – Environment Configuration
# =============================================================================
# Copy this file to .env and fill in your real values.
# Never commit .env to version control.
# =============================================================================

# --- MT5 Account ---
MT5_LOGIN=12345678
MT5_PASSWORD=your_broker_password_here

## 2026-06-30 (Run c17e541c)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```python:src/__init__.py
"""
MT5 AI Multi-Strategy Trading Bot – Source Package
"""
```

```python:src/logger.py
#!/usr/bin/env python3
"""
Centralized logging configuration.

Writes logs to both console and rotating file with timestamped, coloured output
for production monitoring.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok

## 2026-06-30 (Run b402702b)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi‑Strategy Trading Bot

A professional, AI‑driven Python trading bot for **MetaTrader 5** that autonomously selects the most suitable strategy from **20 proven, profitable strategies (2026‑ready)**, enforces institutional risk controls, and dynamically manages positions across all major asset classes: forex, crypto, equities, metals, commodities, indices, and EU‑specific contracts.

---

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-feature

## 2026-06-30 (Run 2cac4bae)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# =============================================================================
# MT5 AI Multi-Strategy Trading Bot – Environment Configuration
# =============================================================================
# Copy this file to .env and fill in your real values.
# Never commit .env to version control – it contains secrets.
# =============================================================================

# --- MT5 Account Credentials ---
MT5_LOGIN=12345678
MT5_

## 2026-06-30 (Run 9c44cc4a)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```python:src/__init__.py
"""MT5 AI Multi-Strategy Trading Bot – Feature Modules Package"""
```

```python:src/logger.py
#!/usr/bin/env python3
"""
Centralised logging configuration for the bot.
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from logging.handlers import RotatingFileHandler

LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

def get_logger(name: str) -> logging.Logger:
    """
    Creates and configures a

## 2026-06-30 (Run 095e272c)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi-Strategy Trading Bot

> **Production‑grade Python bot for MetaTrader 5**  
> Autonomously selects from **20 profitable strategies** using AI, enforces institutional risk controls, and dynamically manages positions across all major asset classes.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [The 20 Strategies](#the-20-strategies)
- [Project Structure](#project-structure)
- [Installation](

## 2026-06-30 (Run 1b054dfa)
- Agent: llm
- Input: Write ONLY the config files, main entry point, and core infrastructure modules. Include: config.py, main.py, .env.example, requirements.txt. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```bash:.env.example
# =============================================================================
# MT5 AI Multi-Strategy Trading Bot – Environment Configuration
# =============================================================================
# Copy this file to .env and fill in your real values.
# Never commit .env to version control – it contains secrets.
# =============================================================================

# --- MT5 Account Credentials ---
MT5_LOGIN=12345678
MT5_

## 2026-06-30 (Run 65f0f745)
- Agent: llm
- Input: Write ONLY the feature modules, business logic, strategies, and algorithms. Do NOT repeat config or main files. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: I'll generate all feature modules, business logic, strategies, and algorithms for the MT5 AI Multi-Strategy Trading Bot. No config or main files are repeated—only the functional logic that makes the bot trade.

## Feature Modules – Full Implementation

Below is every required file, complete with production‑grade code, error handling and in‑line documentation. The bot uses these modules to connect to MT5, manage instruments, apply AI‑based strategy selection, enforce risk limits, and dynamically 

## 2026-06-30 (Run e5502517)
- Agent: llm
- Input: Write ONLY documentation (README.md), tests, and any remaining utility files. Do NOT repeat code from previous parts. Task: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на 
- Output: ```markdown:README.md
# MT5 AI Multi‑Strategy Trading Bot

> A professional, AI‑driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from **20 proven, profitable strategies (2026‑ready)**, enforces institutional risk controls, and dynamically manages positions across all major asset classes.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
  - [Component Diagram](#component-diagram)
  - 
