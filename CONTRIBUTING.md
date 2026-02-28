# Contributing to Forge

Thanks for your interest in contributing! Here's everything you need to get started.

---

## Quick Start

```bash
# 1. Fork & clone
git clone https://github.com/Poojan38380/Forge.git
cd Forge

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in all the values — see .env.local.example for links to each service

# 4. Run the dev server
npm run dev
```

> You'll also need to run Inngest locally for AI features to work:
> ```bash
> npx inngest-cli@latest dev
> ```

---

## What to Work On

- **Bugs** — open a [bug report](https://github.com/Poojan38380/Forge/issues/new?template=bug_report.md)
- **Features** — open a [feature request](https://github.com/Poojan38380/Forge/issues/new?template=feature_request.md) first, before writing code
- **Docs** — always welcome, no issue needed

---

## Making a Pull Request

1. Create a branch: `git checkout -b feat/your-feature-name`
2. Make your changes
3. Commit using [conventional commits](https://www.conventionalcommits.org):
   - `feat: add web scraping tool`
   - `fix: resolve file sync race condition`
   - `docs: update env example`
4. Push and open a PR against `main`

---

## Code Style

- TypeScript everywhere — no `any` if avoidable
- Components go in `src/features/<feature>/components/`
- Hooks go in `src/features/<feature>/hooks/`
- Convex mutations/queries used by the backend go in `convex/system.ts`

---

## Questions?

Open a [GitHub Discussion](https://github.com/Poojan38380/Forge/discussions) or reach out on [GitHub](https://github.com/Poojan38380).
