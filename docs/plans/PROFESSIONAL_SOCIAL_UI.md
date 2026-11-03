# Professional typography and social interaction refinement

User request, 3 November 2026. Supersedes handwritten heading choice.

1. Use existing self-hosted Manrope across web/native. Native launch shows brand during font/session initialization, native splash plugin for standalone builds. Expo Go cannot prove standalone splash appearance.
2. Native tab-page headers show WasteWise; retain bottom navigation labels for orientation/accessibility. Detail back actions use labelled chevron icons. Edit/delete icons retain authorization, confirmations and accessible names.
3. Comments use compact avatar/author/body/time rows plus inline composer. Keep submit action clear, disabled while pending, preserve text on failure. Moderation options are collapsed until requested.
4. Server supports newest/oldest keyset pagination with timestamp/UUID ties; both clients reset pagination when order changes. No client-only reordering of a partial page.
5. Verify backend ordering/pagination, web/native typechecks, web build, Expo exports and critical browser flows. Record physical-device and Expo Go splash limitations.

Files: shared filters; community API; web/native feed/filter/card/detail; native root/layout/ui; app config; API/OpenAPI/design/testing/progress docs. No database migration or model changes.
