# Changelog

## [Unreleased]

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
