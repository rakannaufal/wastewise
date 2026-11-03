# Card menus, red likes and comment replies

Scope: web and Expo mobile, 3 November 2026.

- Card header owns a labelled three-dot disclosure. Owner: edit caption, remove publication, report. Other viewers: report; anonymous viewers sign in first. Preserve operational report deletion in history. Forms live inside the card, never as unrelated page controls. Escape/outside dismissal on web; dismiss/close action on native.
- Like is optimistic, red, count changes immediately, one in-flight request per card. Roll back on failure. Animate scale only; respect reduced motion. Do not reload feed/images/comments after a like. Memoize unaffected cards. Measure device latency before claiming an FPS improvement.
- Comments have one root and one level of replies. Replying to a reply targets its root and prefills a plain-text mention. Roots and each thread paginate separately (30/page); load replies only after expansion. API validates visible root and same post, idempotency includes parent, root deletion hides its thread. No fabricated counters or unbounded tree requests.
- Add nullable parent_id self-FK/check/index through migration; old comments remain roots. Back up and restore-rehearse before additive Supabase migration; preserve rows, no legacy backfill.
- Verify reply ownership/cross-post guards/idempotency/pagination/delete, optimistic rollback, menu roles/keyboard, responsive web/Expo flows, build/export. Native hardware/performance remains an explicit follow-up.
