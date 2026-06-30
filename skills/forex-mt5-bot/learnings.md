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

## 2026-06-30 (Run b77888e5)
- Agent: llm
- Input: Направи ми Python bot  за търговия за Mt5, по последните 20 печеливши стратегии за 2026  година.
Бота да работи на  M15,   да преценява коя от стратегиите е най подходяща в текушите пазарни условия като изпозлва AI.
Да отваря само по една позиция на символна двойка, по дадена стратегия. Всяка стратегия да следи нейната си позиция.
Да няма повече от 3 отворени сделки на символ.
Всички променливи да са изнесени в .env 
Да има дневен drowdown, max drowndown, риск на позиция.
Да може да търгува на форекс,крипто,акции,метали,стоки, индекси, европейски пазари за стоки и индекси.
Да се съобразява със работното време на сеисията за текушия символ. В env   да има променлива, колко минути преди края на сесията , да затваря всички позиции за дадената сесия.
В петък, ( да има пак променлива ) в колко часа да затваря всички позиции.
Да може да управялява динами§но позициите. Предложи вариант.
Добави всичко друго което сметнеш , че ще направи този бот професионален търговски инструкент, както търгуват големите хедж, фондове 

- Output: Ще изградя цялостен професионален Python бот за MetaTrader 5 от хедж-фонд клас, който използва AI за избор на стратегия от 20 изпитани техники. Структурата включва всички модули – конфигурация, стратегии, рисков мениджмънт, управление на сесии и позиции, динамични trailing и частично затваряне, alert-и и много други. Всички променливи са в `.env`.

---

## Проектна структура

```
forex-mt5-bot/
├── .env.example
├── main.py
├── config.py
├── requirements.txt
├── README.md
├── core/
│   ├── __init
