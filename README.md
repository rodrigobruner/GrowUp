# Allowance

## Business Overview
**Allowance** is a playful, family‑friendly PWA that turns daily chores into a rewarding experience. Kids complete tasks, earn **XP**, and redeem rewards, while parents track progress and build consistent habits without pressure or penalties. The dashboard keeps everything clear at a glance with **levels, streak‑like progress, and cycle summaries** (weekly, bi‑weekly, monthly, or yearly).

**Why it matters**
- **Motivates children** with visible progress and level‑ups.
- **Encourages routine** through daily task availability.
- **Gives parents clarity** on earned XP, spending, and cycle results.

Demo: https://rodrigobruner.github.io/Allowance/

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
git clone https://github.com/rodrigobruner/Allowance.git
cd Allowance/allowance

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
- `allowance/src/app` — UI, logic, IndexedDB service
- `allowance/public/i18n` — translation files
- `allowance/public/avatar` — avatar assets
- `allowance/ngsw-config.json` — PWA config
