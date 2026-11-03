# Lighter clients and short card actions

3 November 2026. Preserve Manrope, colors, data eligibility and existing withdrawal semantics.

1. Measure current initial web JavaScript from a production build. Lazy-load Login so its form/validation libraries are downloaded only on auth routes. Add asynchronous decoding to community photos; preserve image dimensions and lazy loading.
2. Web card disclosure registers outside/Escape listeners only while open. Labels on both clients become exactly Edit, Hapus, Laporkan. Confirmation explains that Hapus removes the community publication while retaining the operational report.
3. Mobile feed runs one initial request per active account/filter; focus does not separately trigger a second request. Poll only when screen is focused and app foreground; abort obsolete requests and avoid overlapping polls. Preserve explicit pull-to-refresh, pagination and processing refresh.
4. Mobile post detail polling also pauses offscreen/in background. Share reduced-motion observation across cards rather than one native listener and bridge call per card. Preserve native-driver animation, rollback and ownership.
5. Validate production bundle size before/after, type/lint/build, web+Expo browser scenarios, exact menu labels, feed initial request count, background/blur polling and foreground refresh. Export native bundles; physical frame rate remains unmeasured. No database migration, model change or new runtime dependency.
