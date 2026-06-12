"""
Utility to look up market rent comparisons from the static mietspiegel.json.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_DATA_PATH = Path(__file__).parent.parent / "data" / "mietspiegel.json"


@lru_cache(maxsize=1)
def _load() -> dict[str, Any]:
    with open(_DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def get_supported_cities() -> list[str]:
    return list(_load()["cities"].keys())


def get_city_data(city: str) -> dict[str, Any] | None:
    """Return the full city dict or None if city not in dataset."""
    data = _load()
    # case-insensitive match
    city_lower = city.strip().lower()
    for key, val in data["cities"].items():
        if key.lower() == city_lower:
            return {**val, "city_key": key}
    return None


def get_market_comparison(city: str, area_sqm: float) -> dict[str, Any] | None:
    """
    Return market rent data for a specific city and apartment size.

    Returns None if the city is not in the dataset.
    Returns a dict with keys:
      city, city_supported, band_label, rent_min, rent_avg, rent_max,
      data_year, source
    """
    city_data = get_city_data(city)
    if not city_data:
        return None

    # Find the matching area band
    matched_band: dict | None = None
    for band in city_data["bands"]:
        sqm_min = band["sqm_min"]
        sqm_max = band["sqm_max"]
        if sqm_max is None:
            # Last band: "Über 100 m²"
            if area_sqm >= sqm_min:
                matched_band = band
                break
        elif sqm_min <= area_sqm < sqm_max:
            matched_band = band
            break

    # Fallback: use the closest band if nothing matched (shouldn't happen)
    if matched_band is None and city_data["bands"]:
        matched_band = city_data["bands"][-1]

    if not matched_band:
        return None

    return {
        "city": city_data["display_name"],
        "city_key": city_data["city_key"],
        "city_supported": True,
        "band_label": matched_band["label"],
        "sqm_min": matched_band["sqm_min"],
        "sqm_max": matched_band["sqm_max"],
        "rent_min": matched_band["min"],
        "rent_avg": matched_band["avg"],
        "rent_max": matched_band["max"],
        "data_year": city_data["data_year"],
        "source": city_data["source"],
    }
