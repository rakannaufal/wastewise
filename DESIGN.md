# WasteWise visual system

## Direction

Operate mode. A clear, warm daylight workspace for household reporting and review. Inherit the original emerald/slate brief; strengthen the identity with forest green, real material photos, precise hierarchy and generous working space. No marketing hero, fabricated statistics, decorative gradients, or unrelated illustration.

ENERGY 2 / RHYTHM 2 / MOTION 1. Design variance 4, craft level 8, density 5. Motion communicates pending/complete states and drawer movement; reduced motion disables transitions.

## Tokens

- Page: `#F5F7F4`; sidebar: `#EDF2EC`; surface: `#FFFFFF`.
- Foreground: `#17281F`; muted text: `#56665C`; subtle border: `#DCE4DC`.
- Main action: `#215B3C`; hover: `#17492F`; selection: `#E4EFE5`.
- Status colors are semantic: amber pending, blue in progress, green completed, red rejected. Always pair with text.
- Typeface: self-hosted Plus Jakarta Sans for WasteWise identity and readable product labels, with system fallback. Tabular numerals on counts/confidence.
- Heading 32/40, subheading 20/28, body 14/22, compact labels 12/18. No display font in data tables.
- Spacing: 4, 8, 12, 16, 24, 32, 48. Inputs 10px radius, surfaces 16px, drawers/dialogs 20px. Controls minimum 44px.

## Composition

Desktop: 248px tinted sidebar, 72px topbar, 32px content padding. Sidebar collapses to an accessible drawer on small screens. Dashboard pairs a broad report queue with a narrower classification action and twelve-class guide. Counts come from the API; no fake trend percentages or filler sparklines. Classification uses a large real photo preview and clearly ranked results. Reports use an accessible table on desktop and readable list on phones.

One signature detail: a material preview paired with its next handling action. It appears in classification, report detail, and category guide, tying the product to the twelve-class mechanism.

Authentication uses a quiet material collage from the actual dataset, labeled as examples, beside a 384px email/password form. No unsupported SSO, forgotten-password link, compliance claim, or dead control.

## States and access

Every data region has loading, empty, error/retry, and real-content states. Offline and token expiry are explicit. Prediction unavailable preserves a draft for retry; no manual category or coordinate entry. Confirm destructive actions. Dialog focus is managed; Escape closes; focus returns to the invoker. All normal text and placeholders reach 4.5:1 contrast. Camera permission denied has a gallery alternative. Missing gallery GPS requires explicit current-location confirmation; denied location permission prevents submission until resolved.

Native mobile follows familiar platform navigation, safe area, keyboard avoidance, SecureStore sessions and five tabs. Profile holds account information, privacy guidance and logout. It uses the same colors and material/action signature without copying desktop density.

Distribution charts use horizontal bars and visible numbers, grouped into material composition and handling status. They render only for real nonempty data. Definition-list markup preserves the label/count relationship without relying on color, hover, canvas, or an additional chart dependency.

Lucide icons identify reports, camera input, location, account, pending work and completed work; they are paired with text or accessible labels. They are selected for those concrete meanings. Small uppercase labels separate metadata from body content. Arrows mark navigation to a task or its next handling action; submit, delete and filter controls use direct verbs. Status capsules carry real server state. Shadows are reserved for floating drawers and dialogs; surfaces use quiet borders. Forest green emphasizes the primary task and total-report metric; semantic status colors are the only additional hues.
