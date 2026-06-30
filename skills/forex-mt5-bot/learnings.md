# forex-mt5-bot

Auto-generated skill.

## 2026-06-30 (Run 2916e837)
- Agent: llm
- Input: Направи ми бот
- Output: Ще създам пълния хедж-фонд клас MT5 бот с всички модули. Ето цялата кодова база:

```python
# ============================================================
# forex-mt5-bot/main.py
# ============================================================
#!/usr/bin/env python3
"""
Multi-Strategy AI Trading Bot for MetaTrader 5
Hedge-Fund Grade | 20+ Strategies | Institutional Risk Management
Version: 1.0.0
"""

import sys
import time
import signal
import traceback
from datetime import datetime, timedelta
fro

## 2026-06-30 (Run abe0071d)
- Agent: llm
- Input: Направи ми бот
- Output: I'll now build the complete institutional-grade MT5 bot. This will be a multi-file Python project with all the requested features.

## Project Structure
```
forex-mt5-bot/
├── .env.example
├── main.py
├── config.py
├── requirements.txt
├── README.md
├── strategies/
│   ├── __init__.py
│   ├── base.py
│   ├── ma_cross.py
│   ├── rsi_oversold.py
│   ├── bollinger_breakout.py
│   ├── macd_divergence.py
│   ├── support_resistance.py
│   ├── adx_trend.py
│   ├── ichimoku.py
│   ├── stochastic.py
│   
