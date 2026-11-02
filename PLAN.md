# WasteWise implementation plan

1. Preserve SPEC; implement the user's 12-class WasteWise override across contracts.
2. Audit images, group duplicates, freeze seeded splits; train MobileNetV2 and evaluate the frozen checkpoint.
3. Build PostgreSQL migrations, authenticated FastAPI, private storage, cleanup worker, integration tests.
4. Build connected React web and Expo mobile flows with the DESIGN.md tokens.
5. Verify API, permissions, model inference, web/mobile builds and browser flows. Publish measured evidence and the six deliverables locally.

Risks: dataset imbalance/near duplicates; model quality gate may fail; Supabase and public deployments cannot be verified without credentials. Never replace missing inference or metrics with simulated values.

## Supabase Auth and GitHub delivery

1. Validate the supplied Supabase project and publishable key; inspect existing account/repository access.
2. Integrate Supabase email authentication, confirmed-email handling, managed sessions, and server-validated application profiles. Keep application roles authoritative in PostgreSQL; reject local-token fallback when Supabase is selected.
3. Add migration, provider failure/security tests, web/mobile auth states, and environment documentation. Apply and exercise the local migration and remote Auth connection.
4. Rewrite README installation/use instructions for the actual integration. Review Git contents, exclude secrets/dataset rights, commit and push to the supplied repository; verify the remote revision.
5. Continue independent release gaps: storage reconciliation and deployment configuration. Remote DB/storage changes require project access beyond a publishable key; native device verification requires a device.

Use existing DESIGN.md and ui-craft/antislop during for auth states. No redesign, no model retraining.

## Mobile-first system improvements (implemented, device verification pending, 2 November 2026)

See [docs/SYSTEM_IMPROVEMENT_PLAN.md](docs/SYSTEM_IMPROVEMENT_PLAN.md) for the proposed camera/gallery-to-ML reporting flow, automatic location provenance, transactional report drafts, admin workflow/statistics, responsive behavior, performance budgets, rollout and acceptance tests. The user confirmed current-device GPS may be used for gallery images without GPS after an explicit statement that the photo was taken there. Implementation is available; see docs/WORKFLOW_IMPLEMENTATION.md for verified behavior and outstanding device/deployment gates.
