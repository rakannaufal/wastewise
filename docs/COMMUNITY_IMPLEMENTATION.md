# WasteWise community release

Public landing `/`, login `/login`, authenticated feed `/app`, operational dashboard `/dashboard`, maps `/map`, post `/community/:id`, onboarding `/onboarding`, error families `/errors/:code`. Existing `/reports`, `/classify`, reset-password and owner/admin authorization remain. SPA error pages are user-facing views; static hosting must separately configure real HTTP status codes for crawlable404/5xx if required.

Web uses only Manrope400/500/600/700, self-hosted Latin subsets. Native uses static TTF instances of the same OFL family, including navigation, input and error text. D-16 supersedes the earlier two-font direction. Shared forest palette: foreground17281F, muted56665C, forest215B3C, sageE4EFE5, pageF5F7F4. Logo mark, outlined wordmark, native icon are original vector/geometry assets in shared/assets/brand, web/public and mobile/assets/brand. No invented social posts, testimonials or impact counts.

Resident web has no sidebar: top navigation on desktop, five-item bottom navigation on small screens, profile at `/profile`. Admin operations retain their sidebar; admins opening community routes see the resident shell. Home uses two chronological card columns from1024px and one below. Filters open from an options button, stage changes, commit on Terapkan, cancel on Tutup. Active filter chips expose the applied query. Region parents clear descendants; web URL parameters and unrelated map coordinates are preserved. Pending/In Progress/Completed appear by default; Rejected is excluded; processing remains owner-only, private/hidden/withdrawn reports remain protected.

Native home retains loaded cards during refresh; pagination failures retain previous pages and offer retry. Native maps fill available screen height, show marker summaries, and offer an accessible location-list modal. Report history uses compact search and a status filter sheet; pagination is absent for zero results or one page. See [USER_EXPERIENCE_REFINEMENT_PLAN.md](plans/USER_EXPERIENCE_REFINEMENT_PLAN.md) for the acceptance matrix and PROGRESS for observed evidence.

Native navigation: Beranda/Peta/**Foto68px**/Laporan/Profil. Camera opens as a modal; capture from center action continues to report composer; cancel returns to previous tab. Gallery has its own action. Guide/classification remain accessible without crowding tabs. Feed uses FlatList with bounded render window, server pagination and focus refresh. Token storage remains SecureStore. Native maps use Expo58-supported react-native-maps1.29.11; Expo web has an accessible geographic list, while the main React website has the full interactive map.

Web MapLibre is lazy loaded only on map navigation. Its approximately1MB raw map chunk is intentionally separate from the initial application bundle. Base map uses OpenStreetMap raster tiles with visible attribution, no bulk/offline downloads. Production requires a suitable tile provider/capacity agreement and usage-policy review. Android standalone builds require Google Maps SDK configuration/key; iOS defaults to Apple Maps. Expo Go/export is not proof a standalone Android map has been configured.

New reports automatically publish under public-gps-v2 after a notice explaining anonymous access to photo and precise GPS. Descriptions/captions are optional0..5000. Legacy private reports are preserved, except specifically approved backfills. Eligible posts/maps/details/comments are publicly readable; writes require login. Likes idempotent; comments retry by UUID; moderation has reasons and audit. Hidden/withdrawn posts stop appearing in feed/map/interactions. Signed image links expire within15minutes; downloaded copies cannot be revoked. Original report images remain private. Publication derives separate EXIF-free media outside ML requests.

## Runtime

```bash
# Existing API, web and Metro commands remain in README.
(cd backend-ml && .venv/bin/python -m app.community_worker)
(cd backend-ml && .venv/bin/python -m app.cleanup)
```

The publisher and cleanup are separate processes. `--once` drains due work then exits; failures remain scheduled for retry. Process supervision, monitoring and a shared rate limiter are required before public production rollout. Reference-region import is required for full country filters; absent/ambiguous polygon matches remain explicitly unresolved.

## Assets

[ASSET_PROMPTS.md](plans/ASSET_PROMPTS.md) defines export filenames, ratios, transparent backgrounds and prompts for landing/onboarding/error/empty-state art and logos. The working implementation currently uses real labeled dataset material examples and the original logo. Bespoke raster illustrations are **not generated or claimed delivered**; add approved web outputs through shared/assets/manifest.json (files map); add native static require entries in mobile/src/Illustration.tsx. Landing/onboarding/error surfaces already consume these slots. No AI illustration enters garbage_classification or model evaluation.

## Verification boundaries

Run `npm run check`, `npm run build`, backend Ruff/mypy/pytest and the isolated browser runner documented in TESTING. Browser geolocation is mocked; physical camera/GPS, Android Maps SDK key, denial/reboot/background handling on actual iOS/Android, public HTTPS deployment and real-world model holdout remain device/release gates. See PROGRESS for results actually observed during this change.

New policy and UI supersede earlier contracts in this document: shared header/footer, root3-card preview, /about /faq /privacy, searchable region comboboxes, compact native dropdowns, Caveat heading + Manrope body. Database migration d53e20c61fb8 tested on an isolated database and a restored cloud copy before Supabase application. Continuous workers recover from SQLAlchemy connection errors with5..60second backoff; --once fails loudly.
