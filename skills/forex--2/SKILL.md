# # MT5 AI Multi-Strategy Trading Bot with Dynamic Position Management

Builds a professional, AI‑driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from 20 proven ones, respects institutional risk controls, and manages positions dynamically across all major asset classes.

## Description
This skill delivers a complete, production‑grade trading bot for MT5. It integrates a set of 20 validated, profitable strategies (curated for 2026 market conditions) and employs an AI inference layer that analyses real‑time M15 data to select the optimal strategy for the current market regime. The bot enforces strict position limits—only one trade per strategy per symbol and a maximum of three open trades per symbol overall. All parameters are externalised in a `.env` file, including per‑session closing times, Friday early‑closure logic, daily and maximum drawdown thresholds, and per‑trade risk. Dynamic position management is embedded: the bot can trail stops, partially close, scale in/out based on volatility and P&L, and adjust exposure in real time. The skill supports trading on forex, crypto, equities, metals, commodities, indices, and European‑specific commodity and index contracts, with session‑aware scheduling that closes all positions a configurable number of minutes before market close and enforces a hard cut‑off on Fridays. The architecture mirrors the operational frameworks used by quantitative hedge funds.

## When to Use
- When you need a multi‑strategy, AI‑powered trading bot for MetaTrader 5 that can trade any liquid instrument globally.
- When deploying an automated system that must adhere to strict professional risk controls, including daily and max drawdown limits, per‑symbol position caps, and session‑aware position closures.
- When building a scalable trading infrastructure that combines rule‑based strategies with machine‑learning decisions and dynamic position management, as done by institutional desks.

## Input
- Complete specification of the 20 strategies (entry/exit logic, indicators, parameters) or a knowledge base describing them.
- Asset universe: list of symbols for forex, crypto, equities, metals, commodities, indices, EU contracts.
- `.env` configuration variables: risk per trade (%), daily drawdown limit (%), max drawdown (%), session‑close offset (minutes), Friday close time (UTC), maximum positions per symbol, dynamic management rules (e.g., trailing stop activation threshold, scale‑in conditions).
- MT5 account credentials and server details (optional, to be placed in `.env`).
- Pretrained AI model or framework for strategy selection (if not provided, the skill designs a suitable heuristic/ML approach based on the 20 strategies).

## Output
- Fully functional Python bot structured as a set of modules: connection manager, strategy engine, AI strategy selector, risk controller, dynamic position manager, scheduler, and logger.
- `.env.example` file with all required variables and comments.
- Configuration file mapping strategies to asset classes and timeframes.
- AI selection module (can be a lightweight classifier trained on backtest results or a rule‑based expert system if no model is provided).
- Documentation covering installation, configuration, and operation.
- Backtesting harness to validate the 20 strategies on historical data.

## Primary Agent
**opencode** – the core deliverable is a large, well‑structured Python codebase with integration into external libraries (MetaTrader5, pandas, scikit‑learn/TensorFlow‑Lite for AI). Opencode excels at generating detailed, production‑grade code with proper error handling, logging, and configuration management.

## Example Prompts
- "Създай Python bot за MT5, който използва 20 печеливши стратегии за 2026 г. и AI, за да избира най‑подходящата на M15. Ботът да спазва максимум 3 сделки на символ, да чете всички настройки от .env, да затваря позиции преди края на сесията и в петък по зададено време, и да управлява динамично позициите."
- "Build a hedge‑fund grade MT5 bot that trades forex, crypto, stocks, metals, commodities, and European indices. It must use 20 profiled strategies, an AI layer for strategy picking, per‑session closing logic, daily drawdown caps, and dynamic position scaling. All parameters should be in .env."

# MT5 AI Multi-Strategy Trading Bot with Dynamic Position Management

Builds a professional, AI‑driven Python trading bot for MetaTrader 5 that autonomously selects the most suitable strategy from 20 proven ones, respects institutional risk controls, and manages positions dynamically across all major asset classes.

## Description
This skill delivers a complete, production‑grade trading bot for MT5. It integrates a set of 20 validated, profitable strategies (curated for 2026 market conditions) and employs an AI inference layer that analyses real‑time M15 data to select the optimal strategy for the current market regime. The bot enforces strict position limits—only one trade per strategy per symbol and a maximum of three open trades per symbol overall. All parameters are externalised in a `.env` file, including per‑session closing times, Friday early‑closure logic, daily and maximum drawdown thresholds, and per‑trade risk. Dynamic position management is embedded: the bot can trail stops, partially close, scale in/out based on volatility and P&L, and adjust exposure in real time. The skill supports trading on forex, crypto, equities, metals, commodities, indices, and European‑specific commodity and index contracts, with session‑aware scheduling that closes all positions a configurable number of minutes before market close and enforces a hard cut‑off on Fridays. The architecture mirrors the operational frameworks used by quantitative hedge funds.

## When to Use
- When you need a multi‑strategy, AI‑powered trading bot for MetaTrader 5 that can trade any liquid instrument globally.
- When deploying an automated system that must adhere to strict professional risk controls, including daily and max drawdown limits, per‑symbol position caps, and session‑aware position closures.
- When building a scalable trading infrastructure that combines rule‑based strategies with machine‑learning decisions and dynamic position management, as done by institutional desks.

## Input
- Complete specification of the 20 strategies (entry/exit logic, indicators, parameters) or a knowledge base describing them.
- Asset universe: list of symbols for forex, crypto, equities, metals, commodities, indices, EU contracts.
- `.env` configuration variables: risk per trade (%), daily drawdown limit (%), max drawdown (%), session‑close offset (minutes), Friday close time (UTC), maximum positions per symbol, dynamic management rules (e.g., trailing stop activation threshold, scale‑in conditions).
- MT5 account credentials and server details (optional, to be placed in `.env`).
- Pretrained AI model or framework for strategy selection (if not provided, the skill designs a suitable heuristic/ML approach based on the 20 strategies).

## Output
- Fully functional Python bot structured as a set of modules: connection manager, strategy engine, AI strategy selector, risk controller, dynamic position manager, scheduler, and logger.
- `.env.example` file with all required variables and comments.
- Configuration file mapping strategies to asset classes and timeframes.
- AI selection module (can be a lightweight classifier trained on backtest results or a rule‑based expert system if no model is provided).
- Documentation covering installation, configuration, and operation.
- Backtesting harness to validate the 20 strategies on historical data.

## Primary Agent
**opencode** – the core deliverable is a large, well‑structured Python codebase with integration into external libraries (MetaTrader5, pandas, scikit‑learn/TensorFlow‑Lite for AI). Opencode excels at generating detailed, production‑grade code with proper error handling, logging, and configuration management.

## Example Prompts
- "Създай Python bot за MT5, който използва 20 печеливши стратегии за 2026 г. и AI, за да избира най‑подходящата на M15. Ботът да спазва максимум 3 сделки на символ, да чете всички настройки от .env, да затваря позиции преди края на сесията и в петък по зададено време, и да управлява динамично позициите."
- "Build a hedge‑fund grade MT5 bot that trades forex, crypto, stocks, metals, commodities, and European indices. It must use 20 profiled strategies, an AI layer for strategy picking, per‑session closing logic, daily drawdown caps, and dynamic position scaling. All parameters should be in .env."

## Usage
Generate this skill by running it with appropriate input.

## Input
- Natural language description of what to do

## Output
- Executed task result

## Primary: opencode
