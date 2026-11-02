# Project instructions

## Scope and sources

This project implements the user's Smart Waste Management System blueprint. Read `README.md`, `SPEC.md`, `docs/DECISIONS.md`, and the current `docs/PROGRESS.md` before editing.

The workspace implements WasteWise. Read docs/PROGRESS.md for measured local evidence and unverified remote work. Never describe an untested deployment or device installation as complete.

For technical conflicts within the project documentation, use `docs/DECISIONS.md` and the domain contracts in `docs/` before the original `SPEC.md`. Preserve the original blueprint. Record further decisions explicitly and update every affected contract together. User instructions remain authoritative.

## Working method

- Communicate in Indonesian. Write code, identifiers, comments, and commits in English.
- Inspect existing code, manifests, configuration, and Git boundaries first. Make a short plan for a feature or changes across more than three files.
- The initial workspace resolves Git commands to a parent repository outside this project. Check `git rev-parse --show-toplevel`. Never stage, commit, branch, or modify that parent repository. If implementing this project and no local `.git` exists, initialize Git in this directory first.
- Preserve `web/`, `mobile/`, and `backend-ml/`. Use the specified stack, not a replacement framework.
- Ship runnable vertical slices. Do not rewrite functioning phases or put all application logic in one file.
- Do not create additional chats or delegate to agents unless the user authorizes it.
- Use current compatible, locked dependencies. Verify APIs against the installed version. Do not copy obsolete package pins from generated examples.
- Ask only for information that blocks the relevant work. Continue independent work when external credentials, hardware, or deployment access are unavailable.
- Run the appropriate checks and exercise the actual flow. Record unrun checks as unrun, not passing.
- Update `docs/PROGRESS.md` with commands, environment, results, and evidence paths after each phase.

## Product contracts

- Roles: `admin`, `user`.
- Categories: `battery`, `biological`, `brown-glass`, `cardboard`, `clothes`, `green-glass`, `metal`, `paper`, `plastic`, `shoes`, `trash`, `white-glass`. User instructions override the original three-class SPEC. Read shared/categories.json.
- Statuses: `Pending`, `In Progress`, `Completed`, `Rejected`.
- Endpoint paths are lowercase under `/api/v1`.
- Response envelope: `success`, `message`, `data`.
- Registration never accepts a caller-supplied role. Bootstrap admin with an explicit local command and a password entered securely.
- Scope reports and statistics on the server. Verify the current database user and role for every authenticated request.
- Apply filtering and pagination on the server; frontend reflects the returned page.
- Never trust a submitted AI confidence. Follow `docs/API.md` for server-derived prediction metadata.
- Use private image storage, authorized signed URLs, bounded uploads, and retryable storage cleanup.
- Do not put secrets in `VITE_*`, `EXPO_PUBLIC_*`, logs, fixtures, docs, or source control.
- Supabase sessions use Expo SecureStore on native and SDK-managed browser storage on web, with automatic refresh and PKCE. Local test auth uses memory-only web tokens. Never replace server token verification with decoded client claims.
- Follow PRODUCT.md and DESIGN.md for the WasteWise visual brief. Verify contrast, keyboard support, mobile layout, loading, empty, error, and offline states. Preserve SPEC.md as the original blueprint.

## Machine Learning integrity

- Use the licensed source and mapping in `docs/DATASET.md`.
- Deduplicate and group related images before the fixed 70/15/15 split. Augment training data only.
- Keep the test split out of model selection, threshold selection, and tuning.
- Persist `class_to_idx`, preprocessing, dataset/split fingerprints, model configuration, seed, environment, and checkpoint checksum.
- Training and serving must share the architecture, class mapping, and deterministic validation preprocessing.
- Missing or invalid checkpoint: prediction returns `503`. Never return a random or hardcoded prediction as inference.
- Never fabricate dataset counts, model weights, metrics, charts, latency, tests, or production claims.
- Acceptance: test accuracy strictly greater than `0.85`, each class F1 at least `0.75`. A failing model remains a failing model with honest evaluation.

## Delivery

The six deliverables in `docs/DELIVERABLES.md` are mandatory. Documentation cannot substitute for actual source, a dataset package, a trained checkpoint, or measured evaluation results.

Keep README installation and usage instructions aligned with the actual scripts. Run the final installation procedure in a clean environment. Report what changed, what ran, exact remaining gaps, and the next useful action.
