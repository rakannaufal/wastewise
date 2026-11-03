# WasteWise visual system

## Direction

Public landing uses Persuade mode; authenticated web and native use Operate mode. A clear, warm daylight workspace for household reporting and review. Inherit the original emerald/slate brief; strengthen the identity with forest green, real material photos, precise hierarchy and generous working space. Public landing introduces the real photo, classification, GPS and community flow. No fabricated statistics, testimonials or partners.

ENERGY 2 / RHYTHM 2 / MOTION 1. Design variance 4, craft level 8, density 5. Motion communicates pending/complete states and drawer movement; reduced motion disables transitions.

## Tokens

- Page: `#F5F7F4`; sidebar: `#EDF2EC`; surface: `#FFFFFF`.
- Foreground: `#17281F`; muted text: `#56665C`; subtle border: `#DCE4DC`.
- Main action: `#215B3C`; hover: `#17492F`; selection: `#E4EFE5`.
- Status colors are semantic: amber pending, blue in progress, green completed, red rejected. Always pair with text.
- Typeface: self-hosted Manrope (400/500/600/700) for every web/native text surface, including landing, onboarding, errors, navigation and controls. Use weight and scale for emphasis, no handwriting font. System fallback only on font failure. Tabular numerals on counts/confidence.
- Web heading 32/40, native heading 26/34, subheading 20/28, body 15/22, compact labels 12/18. No display font in data tables.
- Spacing: 4, 8, 12, 16, 24, 32, 48. Inputs 10px radius, surfaces 16px, drawers/dialogs 20px. Controls minimum 44px.

## Composition

Resident web uses a 72px top navigation, centered content up to1184px, no sidebar. Small-screen web uses a five-item bottom navigation with a larger camera action. Community routes use this shell even for admins. Administrative dashboard, users, moderation and report management retain the248px sidebar and accessible small-screen drawer. Counts come from the API; no fake trend percentages or filler sparklines. Classification uses a large real photo preview and clearly ranked results. Reports use an accessible table on desktop and readable list on phones.

Community cards lead the home page: two chronological columns from1024px, one column below, actual4:3 photos, author/time, status, category, description, GPS and interactions. No permanent slogan rail. Filters stay behind one options icon; the panel stages region/category/status until Apply. Cancel preserves the applied query; Reset stages unfiltered values. Active chips expose applied filters. Every published report status appears by default; private reports never become feed entries automatically. Native maps fill the remaining screen and provide an accessible location list; report history uses compact search and a status filter sheet.

One signature detail: a material preview paired with its next handling action. It appears in classification, report detail, and category guide, tying the product to the twelve-class mechanism.

Authentication uses a quiet material collage from the actual dataset, labeled as examples, beside a 384px email/password form. No unsupported SSO, forgotten-password link, compliance claim, or dead control.

## States and access

Every data region has loading, empty, error/retry, and real-content states. Offline and token expiry are explicit. Prediction unavailable preserves a draft for retry; no manual category or coordinate entry. Confirm destructive actions. Dialog focus is managed; Escape closes; focus returns to the invoker. All normal text and placeholders reach 4.5:1 contrast. Camera permission denied has a gallery alternative. Missing gallery GPS requires explicit current-location confirmation; denied location permission prevents submission until resolved.

Native mobile follows familiar platform navigation, safe area, keyboard avoidance, SecureStore sessions and five visible tabs: Beranda, Peta, Foto, Laporan, Profil. Foto is a raised 68px camera action; guides remain accessible from Profil. Profile holds account information, privacy guidance and logout. It uses the same colors and material/action signature without copying desktop density.

Distribution charts use horizontal bars and visible numbers, grouped into material composition and handling status. They render only for real nonempty data. Definition-list markup preserves the label/count relationship without relying on color, hover, canvas, or an additional chart dependency.

Lucide icons identify reports, camera input, location, account, pending work and completed work; they are paired with text or accessible labels. They are selected for those concrete meanings. Small uppercase labels separate metadata from body content. Arrows mark navigation to a task or its next handling action; submit, delete and filter controls use direct verbs. Status capsules carry real server state. Shadows are reserved for floating drawers and dialogs; surfaces use quiet borders. Forest green emphasizes the primary task and total-report metric; semantic status colors are the only additional hues.

## Community expansion, 2026-11-03

Unified forest-green palette on both platforms. Public landing at `/`, logged-in feed at `/app`, operations at `/dashboard`, maps at `/map`. Feed uses real published user photos; sample dataset photos on landing are explicitly labeled examples. Exact GPS is disclosed only by publication consent. Error artwork slots and asset prompts are documented in docs/plans/ASSET_PROMPTS.md. No invented illustrations or generated training data.
