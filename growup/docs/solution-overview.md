# GrowUp - Solution Overview

## Goal
GrowUp is a gamification system for routines, with tasks, rewards, and cycles. The goal is to help users stay consistent over time by offering points (XP) and rewards as incentives.

## Key Concepts
- **Profile**: the active user context (avatar, name, cycle preference).
- **Cycle**: the period used to measure progress and limit rewards (weekly, biweekly, monthly, yearly).
- **Tasks**: activities that grant XP when completed.
- **Rewards**: items that can be redeemed with XP, with a per-cycle limit.
- **Redemption (Redeemed)**: a reward that was purchased and not yet consumed.
- **Consumption (Used)**: a reward that was used; final status.

## Application Flow
1. The user selects an active profile.
2. Completed tasks generate XP.
3. XP balance is available to redeem rewards.
4. Rewards are controlled by a per-cycle limit.
5. Redeemed rewards stay in **Redeemed** until they are consumed or returned.

## Task Logic
- Each task has a points value.
- When completed, a **Completion** record is created for a date.
- Total XP depends on completions within the displayed cycle/period.

## Rewards Logic (Store)
The Rewards section behaves like a store with per-cycle inventory:
- **Available**: items in stock (remaining stock > 0).
- **Redeemed**: items purchased and not yet consumed.
- **Used**: items consumed (do not return to stock).

### Redemption Rules
- Each item has a **limit per cycle**.
- When redeeming:
  - a single line is created in **Redeemed**.
  - 1 unit is subtracted from the cycle stock.
  - if it reaches 0, the item becomes unavailable in **Available**.

### Use and Return Rules
- **Consume**:
  - marks the item as used.
  - moves it to **Used**.
  - final, cannot be removed or returned.
- **Return**:
  - removes the item from **Redeemed**.
  - restores 1 unit to the cycle stock.
  - only allowed if it has not been consumed.

## Persistence and Sync
- Main data is stored locally (IndexedDB via Dexie) and synced to Supabase.
- Synced entities: profiles, tasks, rewards, completions, settings, redemptions.
- **Used (rewardUses)** is local only (not synced). To sync it, add a table/column on the backend.

## Main Interfaces
- **Home**: cycle summary, tasks, and rewards.
- **Dialogs**: create/edit tasks and rewards, settings, and authentication.
- **DevUI**: design system showcase.

## How to Use
1. Create or select a profile.
2. Register tasks and rewards.
3. Complete tasks to earn XP.
4. Redeem rewards in the Available tab.
5. Consume or return rewards in the Redeemed tab.

## Important Rules
- Per-cycle limits are strictly enforced.
- Each redemption creates a single line.
- Consumed items are final.
- Returns are only allowed before consumption.

## Design System Notes
- Components follow the main visual theme (blue/cream/gold).
- Fields use a compact Material style with white backgrounds.
- Tooltips guide actions in Rewards.
