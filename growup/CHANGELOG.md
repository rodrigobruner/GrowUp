# Changelog

## [Unreleased]
### Summary
- Refresh the onboarding layout with a three-column structure and a supporting illustration.
- Clear session UI state immediately on auth changes to avoid showing stale level, tasks, and rewards.
- Clear local data and reload after account deletion to avoid stale UI.
- Default the cycle selector to biweekly when missing settings data.
- Always reload after account deletion even if cache cleanup fails.
- Refresh session data after creating or editing a profile so the UI updates immediately.
- Do not block account deletion cleanup when sign-out fails.
- Gate dashboard rendering behind a centralized session status to avoid stale UI flashes.
- Add a landing page at `/` and move the dashboard to `/dashboard` with demo-mode routing.
- Ensure onboarding renders for logged-in users with no profiles, even during initial loading.
- Redesign the landing page as a full-screen, one-page presentation with alternating sections.
- Allow the landing page to scroll through all full-screen sections.

### Impact
- The onboarding card now shows the Create New Profile action alongside an illustration, with a stacked layout on smaller screens.
- After login or logout, the home panels are hidden until the new session state loads, preventing stale data from flashing.
- After deleting an account, the app clears cached data and reloads so the UI resets immediately.
- Settings now fall back to the biweekly cycle when the stored cycle is missing, keeping the select prefilled.
- Account deletion now forces a page reload even if cache cleanup throws.
- Saving a profile now reloads session data so the dashboard reflects the new profile without a manual refresh.
- Account deletion cleanup proceeds even if Supabase sign-out errors, ensuring the visitor state is restored.
- The dashboard (summary, tasks, rewards) only renders after the session is ready, keeping onboarding consistent.
- Visitors now see a presentation page and must choose demo or login before accessing `/dashboard`.
- New users redirected to the dashboard will see onboarding immediately when no profiles exist.
- The landing page now scrolls through full-screen sections with alternating palettes and visuals.
- Visitors can scroll through every section on `/` without being locked to a single panel.

### Validation
- Open the app with no profiles and confirm the onboarding card shows text, button, and image in three columns on desktop.
- Resize to a mobile width and confirm the same elements stack vertically and the button spans full width.
- Log in with a new user and confirm the onboarding card is shown while level, tasks, and rewards remain hidden until data loads.
- Delete an account and confirm the app clears local data and reloads to the initial state.
- Open Settings with a profile that has no cycle saved and confirm the cycle select defaults to biweekly.
- Delete an account while offline and confirm the app still forces a reload after the cleanup attempt.
- Create a new profile from onboarding and confirm the dashboard updates without refreshing.
- Delete an account and confirm the app reloads even if Supabase sign-out fails.
- Log in with a new user and confirm only onboarding content renders until the session is ready.
- Open `/` while logged out and confirm the landing page renders with login/demo CTAs.
- Click the demo CTA and confirm it navigates to `/dashboard` and loads seeded data.
- Log in and confirm automatic redirection to `/dashboard`.
- Log in with a new account and confirm onboarding appears even while the session is loading and no profiles exist.
- Scroll the landing page and confirm each section fills the viewport with alternating colors and imagery.
- Confirm the landing page scrolls through all sections on desktop and mobile.

### Changed
- Make the onboarding "Create New Profile" button large, with a max width of 400px, and use the app gold theme color.
- Add a right-side onboarding illustration and convert the layout to three responsive columns.
- Center the Create New Profile button within its onboarding column on desktop.
- Align the onboarding copy to the left while keeping equal column widths on desktop.
- Only show the onboarding card to authenticated users.
- Extract the onboarding UI into a dedicated standalone component.
- Reset in-memory session state when the authenticated user changes.
- Clear local storage, IndexedDB, and cache on account deletion before reloading.
- Default missing cycle settings to biweekly (with a safe date fallback).
- Guarantee a reload after account deletion using a finally block around cleanup.
- Refresh session state after profile save to pick up the new profile immediately.
- Ignore sign-out errors after account deletion to allow local cleanup and reload.
- Use session status to gate rendering of the main dashboard.
- Move the existing dashboard layout into a dedicated `/dashboard` route and add a landing page.
- Loosen onboarding gating to show during loading for logged-in users with no profiles.
- Build the landing page layout as a single scrolling experience with alternating visual sections.
- Enable vertical scrolling so the one-page presentation can show every section.

## [1.0.1] - 2026-02-02
### Summary
- Standardize solution overview documentation in English and align README test instructions.

### Impact
- Documentation-only changes; no runtime behavior changes.

### Validation
- Review `docs/solution-overview.md` for accuracy and consistency with the domain model.
- Confirm `README.md` test instructions match `ng test`.

### Changed
- Translate and standardize `docs/solution-overview.md` to English.
- Update README unit test instructions to match the Angular test setup.
- Align changelog release version with `package.json`.

## [1.0.0] - 2026-01-21
### Added
- Initialize the Angular application with a basic structure and routing.
- Add Angular Material and theming support.
- Refactor the app with new features and UI enhancements.
- Add localization files in English and Portuguese.
- Add default task seeding with language-specific tasks.
- Implement task and reward dialog components.
- Convert dialogs, topbar, panel, and cards into components.
- Add language selection and level-up dialog components.
- Update settings with language support and level-up points structure.
- Add favicon images for the application.
- Include an initial README with overview, technical details, and setup instructions.

### Fixed
- Fix base-href in the `build:gh` script.
- Adjust translation loader path and avatar image source.
- Update `httpTranslateLoader` to normalize baseHref.
