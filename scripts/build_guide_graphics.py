"""Render authored material vectors to lightweight native PNGs using librsvg."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web/public/illustrations/materials"
NATIVE = ROOT / "mobile/assets/illustrations/materials"
WEB.mkdir(parents=True, exist_ok=True)
NATIVE.mkdir(parents=True, exist_ok=True)
BOTTLE = '<path d="M104 45h32v39l20 26v75q0 15-15 15H99q-15 0-15-15v-75l20-26Z" fill="{color}"/><path d="M104 55h32M84 124h72M84 168h72M101 113v63"/><path d="M103 37h34v13h-34Z" fill="{cap}"/>'
ART = {
    "battery": (
        "#f9edcf",
        '<g transform="rotate(-12 120 120)"><rect x="73" y="48" width="56" height="146" rx="12" fill="#efd07d"/><path d="M73 87h56v67H73Z" fill="#f9f7ec"/><path d="M90 39h22v9H90ZM91 69h20m-10-10v20m-10 96h20"/><rect x="141" y="87" width="36" height="107" rx="9" fill="#b4cdb8"/><path d="M141 118h36m-18-21v12m-6-6h12m-12 73h12"/></g>',
    ),
    "biological": (
        "#e9efdc",
        '<path d="M104 185C42 177 37 97 73 64c8 61 49 84 88 74 7 19-18 50-57 47Z" fill="#efd47e"/><path d="M73 64l12-15 10 8-6 20M65 94c4 46 35 70 70 69"/><path d="M142 105c-4-44 18-65 56-64 3 38-15 67-56 64Z" fill="#9fc29c"/><path d="m142 105 33-40"/><path d="M151 195c-14-23-7-44 15-53 24 16 25 39 4 56" fill="#d0b385"/><path d="m164 161 5 31"/>',
    ),
    "cardboard": (
        "#f2eadc",
        '<path d="m64 98 65-26 57 28-65 30Z" fill="#d7b68b"/><path d="m64 98 57 32v69l-57-33ZM121 130l65-30v66l-65 33Z" fill="#c7a477"/><path d="m64 98-19-22 64-25 20 21ZM129 72l19-21 57 27-19 22" fill="#ead5b4"/><path d="m64 98 57 32-20 21-57-32ZM121 130l22 21 62-31-19-20" fill="#e4c89d"/><path d="m142 165 23-11m-23 20 15-7"/>',
    ),
    "clothes": (
        "#e4eee7",
        '<path d="m83 60 20-12q17 19 34 0l20 12 37 35-26 29-17-14v88H89v-88l-17 14-26-29Z" fill="#a8c5b4"/><path d="M103 48q17 38 34 0M89 180h62M66 79l23 24m85-24-23 24"/><path d="m110 122 11-10 11 10v26h-22Z" fill="#f7f5e9"/>',
    ),
    "metal": (
        "#e5eceb",
        '<path d="M74 67h92v116q0 15-46 15t-46-15Z" fill="#b8ccc8"/><ellipse cx="120" cy="67" rx="46" ry="16" fill="#e4ece5"/><ellipse cx="120" cy="68" rx="18" ry="7" fill="#90ada6"/><path d="M74 91q46 20 92 0M74 167q46 20 92 0M88 108v41m64-41v41"/><path d="m107 112 25 0 9 16-14 24h-18l-10-17Z" fill="#f8f7ed"/>',
    ),
    "paper": (
        "#f7f0db",
        '<path d="m65 65 105-17 24 130-105 18Z" fill="#c3d7c1"/><path d="M58 42h92l31 32v124H58Z" fill="#fffdf2"/><path d="M150 42v32h31M78 98h80M78 116h80M78 134h58M78 169h39"/><path d="M78 66h39v15H78Z" fill="#e7ce85"/>',
    ),
    "plastic": ("#e3eee7", BOTTLE.format(color="#b6d8cb", cap="#e2c978")),
    "shoes": (
        "#f0e7db",
        '<path d="m52 136 20-59 36 14 18 35 49 20q23 8 23 30v8H42v-22q0-16 10-26Z" fill="#c6ac87"/><path d="M42 168h156v16H42Z" fill="#faf8ed"/><path d="m103 101 22-10m-16 25 24-11m-18 24 25-10M52 136l35 11M73 82l-10 36 22 7"/>',
    ),
    "trash": (
        "#e9ecdf",
        '<path d="m104 74-16-30 33 9 26-10-9 31q45 25 48 82 6 40-64 43-67-3-64-43 3-55 46-82Z" fill="#b2c1a0"/><path d="m98 78 48 1M104 94q-25 31-23 64m48-62q26 30 28 62"/><path d="m108 125 23-7 18 19-9 26-29 1-13-23Z" fill="#f3edd5"/><path d="m112 138 20 12m-20 0 20-12"/>',
    ),
}
for name, color, bg in [
    ("brown-glass", "#bd946b", "#f2e6d8"),
    ("green-glass", "#91b49c", "#e4eddf"),
    ("white-glass", "#e6eeea", "#e5ece9"),
]:
    ART[name] = (bg, BOTTLE.format(color=color, cap="#d1b67f"))
for name, (background, body) in ART.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><rect width="240" height="240" rx="24" fill="{background}"/><g stroke="#254b3b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">{body}</g></svg>\n'
    path = WEB / f"{name}.svg"
    path.write_text(svg)
    subprocess.run(
        [
            "rsvg-convert",
            "--width",
            "320",
            "--height",
            "320",
            "--output",
            str(NATIVE / f"{name}.png"),
            str(path),
        ],
        check=True,
    )
print(f"Rendered {len(ART)} material graphics for web/native")
