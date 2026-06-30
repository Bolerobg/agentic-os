# # Multi-Strategy AI Trading Bot for MetaTrader 5 (Hedge‑Fund Grade)
Engineer a full‑featured Python trading bot for MT5 that harnesses AI to dynamically select among 20+ profitable strategies, with rigorous position management, multi‑asset support, and institutional risk controls.

## Description
This skill provides a complete blueprint and implementation code for a MetaTrader 5 automated trading system that continuously analyzes M15 market data using an AI model to choose the most appropriate strategy from a library of 20 advanced, year‑2026‑proven strategies. The bot strictly enforces one position per strategy per symbol, a maximum of three open trades per symbol, and all sensitive parameters are externalized in a `.env` file for easy configuration. It incorporates professional‑grade capital preservation: daily drawdown, total max drawdown, per‑trade risk, dynamic position management (trailing stops, break‑even, partial exits), session‑aware trading across forex, crypto, equities, metals, commodities, indices, and European markets, with automatic closure before session end and a Friday cut‑off time. Additional institutional features include correlation filters, news event detection, comprehensive logging, performance analytics, and remote monitoring alerts—all structured as a production‑ready, scalable Python codebase.

## When to Use
- When deploying a persistent, fully automated multi‑asset trading system on MetaTrader 5 that mimics hedge‑fund discipline.
- When you need an AI‑driven strategy selection engine that adapts to changing market regimes on an M15 timeframe.
- When rigorous risk management and session‑aware position handling are critical, including cross‑market scheduling and forced closures.

## Input
- MT5 account credentials and server details (put in `.env`).
- A `.env` template with all configurable variables: risk per trade (%), daily drawdown limit (%), max drawdown (%), minutes before session close, Friday close time, maximum trades per symbol, symbol lists per asset class, session schedules, AI model API keys, etc.
- Definition of the 20 strategies (provided as Python classes/config files or a detailed specification).
- Market data access (MT5 connection) and AI inference endpoint.
- (Optional) Economic calendar or news feed for filtering.

## Output
- A complete, modular Python application: main bot loop, AI strategy selector, strategy implementations, position manager, risk manager, session scheduler, order executor, logger, and alerting module.
- A ready‑to‑use `.env.example` file with explanations for each parameter.
- Documentation string in‑code and a README explaining deployment, architecture, and how to add new strategies.
- Unit tests for critical components and integration test guide.
- Fully commented, typed (Python type hints) code following professional software practices.

## Primary Agent
**opencode** – because this skill requires generating a large, production‑grade Python codebase with multiple inter‑connected modules, real‑time market data handling, API integrations, and rigorous error handling. opencode excels at writing complete, structured, and immediately usable software. For architectural decisions or refining the AI selection logic, you can brief **hermes** before passing the refined specification to opencode.

## Example Prompts
- "Build the complete institutional MT5 trading bot with the 20 strategies, .env configuration, AI strategy selector, session‑aware closing, and dynamic position management."
- "Generate the Python module for dynamic position management that supports trailing stops, breakeven triggers, partial take‑profit, and per‑strategy tracking."
- "Create the .env.example template with all necessary parameters for a multi‑asset hedge fund bot, including risk limits, session times, and Friday early‑close settings."

# Multi-Strategy AI Trading Bot for MetaTrader 5 (Hedge‑Fund Grade)
Engineer a full‑featured Python trading bot for MT5 that harnesses AI to dynamically select among 20+ profitable strategies, with rigorous position management, multi‑asset support, and institutional risk controls.

## Description
This skill provides a complete blueprint and implementation code for a MetaTrader 5 automated trading system that continuously analyzes M15 market data using an AI model to choose the most appropriate strategy from a library of 20 advanced, year‑2026‑proven strategies. The bot strictly enforces one position per strategy per symbol, a maximum of three open trades per symbol, and all sensitive parameters are externalized in a `.env` file for easy configuration. It incorporates professional‑grade capital preservation: daily drawdown, total max drawdown, per‑trade risk, dynamic position management (trailing stops, break‑even, partial exits), session‑aware trading across forex, crypto, equities, metals, commodities, indices, and European markets, with automatic closure before session end and a Friday cut‑off time. Additional institutional features include correlation filters, news event detection, comprehensive logging, performance analytics, and remote monitoring alerts—all structured as a production‑ready, scalable Python codebase.

## When to Use
- When deploying a persistent, fully automated multi‑asset trading system on MetaTrader 5 that mimics hedge‑fund discipline.
- When you need an AI‑driven strategy selection engine that adapts to changing market regimes on an M15 timeframe.
- When rigorous risk management and session‑aware position handling are critical, including cross‑market scheduling and forced closures.

## Input
- MT5 account credentials and server details (put in `.env`).
- A `.env` template with all configurable variables: risk per trade (%), daily drawdown limit (%), max drawdown (%), minutes before session close, Friday close time, maximum trades per symbol, symbol lists per asset class, session schedules, AI model API keys, etc.
- Definition of the 20 strategies (provided as Python classes/config files or a detailed specification).
- Market data access (MT5 connection) and AI inference endpoint.
- (Optional) Economic calendar or news feed for filtering.

## Output
- A complete, modular Python application: main bot loop, AI strategy selector, strategy implementations, position manager, risk manager, session scheduler, order executor, logger, and alerting module.
- A ready‑to‑use `.env.example` file with explanations for each parameter.
- Documentation string in‑code and a README explaining deployment, architecture, and how to add new strategies.
- Unit tests for critical components and integration test guide.
- Fully commented, typed (Python type hints) code following professional software practices.

## Primary Agent
**opencode** – because this skill requires generating a large, production‑grade Python codebase with multiple inter‑connected modules, real‑time market data handling, API integrations, and rigorous error handling. opencode excels at writing complete, structured, and immediately usable software. For architectural decisions or refining the AI selection logic, you can brief **hermes** before passing the refined specification to opencode.

## Example Prompts
- "Build the complete institutional MT5 trading bot with the 20 strategies, .env configuration, AI strategy selector, session‑aware closing, and dynamic position management."
- "Generate the Python module for dynamic position management that supports trailing stops, breakeven triggers, partial take‑profit, and per‑strategy tracking."
- "Create the .env.example template with all necessary parameters for a multi‑asset hedge fund bot, including risk limits, session times, and Friday early‑close settings."

## Usage
Generate this skill by running it with appropriate input.

## Input
- Natural language description of what to do

## Output
- Executed task result

## Primary: opencode
