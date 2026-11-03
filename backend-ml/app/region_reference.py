"""Parse reference dumps as data, resolve points against polygons, never SQL."""

import json
import re

NAMES = re.compile(r"\('([0-9.]+)','((?:[^'\\]|\\.|'')*)'\)")
BOUNDARIES = re.compile(r"\('([0-9.]+)','(?:[^'\\]|\\.|'')*',[-+0-9.eE]+,[-+0-9.eE]+,'(\[.*?\])'\)")


def names(text):
    return [
        (code, name.replace("\\'", "'").replace("''", "'")) for code, name in NAMES.findall(text)
    ]


def rings(value):
    if not isinstance(value, list) or not value:
        return []
    if isinstance(value[0], list) and len(value[0]) >= 2 and isinstance(value[0][0], (int, float)):
        return [value]
    return [ring for item in value for ring in rings(item)]


def geometries(text):
    for code, raw in BOUNDARIES.findall(text):
        paths = rings(json.loads(raw))
        points = [p for ring in paths for p in ring]
        if not points or any(not (-90 <= p[0] <= 90 and -180 <= p[1] <= 180) for p in points):
            continue
        yield (
            code,
            {
                "rings": paths,
                "bbox": [
                    min(p[1] for p in points),
                    min(p[0] for p in points),
                    max(p[1] for p in points),
                    max(p[0] for p in points),
                ],
            },
        )


def contains(geometry, latitude, longitude):
    # Even-odd rings preserve holes and detached islands without guessing winding.
    west, south, east, north = geometry["bbox"]
    if not (west <= longitude <= east and south <= latitude <= north):
        return False
    inside = False
    for ring in geometry["rings"]:
        previous = ring[-1]
        for current in ring:
            y1, x1 = previous[:2]
            y2, x2 = current[:2]
            if (y1 > latitude) != (y2 > latitude) and longitude < (x2 - x1) * (latitude - y1) / (
                y2 - y1
            ) + x1:
                inside = not inside
            previous = current
    return inside
