# AI-Assisted Development & Experimentation

This project was intentionally developed with the assistance of AI tools.

Its purpose is to experiment with and evaluate AI-powered development solutions — such as GitHub Copilot, Codex, Claude, Grok, Gemini and cloud-based AI services, analyzing their impact on productivity, code quality, accuracy, configuration workflows, and decision-making.

AI is used as a productivity and exploration tool. All critical design choices, validations, and final code are reviewed and refined by the developer.

---

# GrowUp

GrowUp was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.0.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Supabase migrations

Migrations live in `supabase/migrations/` and are applied in order. We use the Supabase CLI for local and CI runs.

### Local workflow

```bash
supabase migration new add_feature_name
supabase db reset
supabase db push
```

If you prefer npm scripts:

```bash
npm run supabase:reset
npm run supabase:push
```

### CI workflow

The GitHub Action `.github/workflows/supabase-migrate.yml` runs `supabase db push` on changes to `supabase/migrations/`.
Provide the following repository secrets:

- `SUPABASE_ACCESS_TOKEN` (Supabase access token)
- `SUPABASE_PROJECT_REF` (Supabase project reference ID)

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
