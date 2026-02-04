# GrowUp

# ⚠️ AI-Assisted Development & Experimentation

This project was intentionally developed with the assistance of AI tools.

Its purpose is to experiment with and evaluate AI-powered development solutions — such as GitHub Copilot, Codex, Claude, Grok, Gemini and cloud-based AI services, analyzing their impact on productivity, code quality, accuracy, configuration workflows, and decision-making.

AI is used as a productivity and exploration tool. All critical design choices, validations, and final code are reviewed and refined by the developer.

---

## Business Overview
**GrowUp** is a playful, family‑friendly PWA that turns daily chores into a rewarding experience. Kids complete tasks, earn **XP**, and redeem rewards, while parents track progress and build consistent habits without pressure or penalties. The dashboard keeps everything clear at a glance with **levels, streak‑like progress, and cycle summaries** (weekly, bi‑weekly, monthly, or yearly).

**Why it matters**
- **Motivates children** with visible progress and level‑ups.
- **Encourages routine** through daily task availability.
- **Gives parents clarity** on earned XP, spending, and cycle results.

Demo: https://growup.bruner.app

---

## Technical Details
### Stack
- **Angular 21** + **Angular Material**
- **IndexedDB** persistence
- **ngx‑translate** for runtime i18n (EN default, PT available)
- **PWA** with Service Worker

### Core Features
- **Daily task reset**: each task can be completed once per day.
- **XP ledger**: total XP earned, XP spent, and current/previous cycle totals.
- **Configurable cycles**: weekly, bi‑weekly, monthly, yearly (with custom start date).
- **Localized UI**: `public/i18n/en.json` and `public/i18n/pt.json`.

### Run Locally
```bash
# Clone
git clone git@github.com:rodrigobruner/GrowUp.git
cd GrowUp/growup

# Install dependencies
npm install

# Start dev server
npm run start
```

### Production Build
```bash
npm run build
```

### GitHub Pages Deploy
```bash
npm run deploy
```

---

## Project Structure (High‑Level)
- `growup/src/app` — UI, logic, IndexedDB service
- `growup/public/i18n` — translation files
- `growup/public/avatar` — avatar assets
- `growup/ngsw-config.json` — PWA config
