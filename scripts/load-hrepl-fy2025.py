#!/usr/bin/env python3
"""Load HREPL FY 2025-26 Scope 3 activity data into Payload."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / "backend" / ".env"
BASE = os.environ.get("PAYLOAD_URL", "http://127.0.0.1:3001").rstrip("/")
SESSION_KEY = "hrepl-fy2025-26"


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def request(method: str, path: str, body: dict | None = None) -> dict:
    secret = os.environ.get("PAYLOAD_SECRET")
    if not secret:
        raise SystemExit("PAYLOAD_SECRET is not set")
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        f"{BASE}/api{path}",
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "x-payload-secret": secret,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode()[:400]
        raise SystemExit(f"Payload {error.code} {method} {path}: {detail}") from error


def find_company() -> dict | None:
    query = urllib.parse.urlencode({
        "where[sessionKey][equals]": SESSION_KEY,
        "limit": "1",
        "depth": "0",
    })
    result = request("GET", f"/companies?{query}")
    docs = result.get("docs") or []
    return docs[0] if docs else None


def list_children(slug: str, company_id: str) -> list[dict]:
    query = urllib.parse.urlencode({
        "where[company][equals]": company_id,
        "limit": "1000",
        "depth": "0",
    })
    return (request("GET", f"/{slug}?{query}").get("docs") or [])


def replace_children(slug: str, company_id: str, rows: list[dict]) -> None:
    for row in list_children(slug, company_id):
        request("DELETE", f"/{slug}/{row['id']}")
    for row in rows:
        request("POST", f"/{slug}", {**row, "company": company_id})


def values(base: dict[str, str], extra: dict[str, str]) -> dict[str, str]:
    out = dict(base)
    out.update(extra)
    return out


def item(
    client_id: str,
    category_id: int,
    method: str,
    factor: str,
    label: str,
    quantity: str,
    unit: str,
    vals: dict[str, str],
    *,
    activity_done: bool,
    method_done: bool,
    factors_done: bool,
) -> dict:
    packed = dict(vals)
    packed.update({
        "__activityDone": "1" if activity_done else "",
        "__methodDone": "1" if method_done else "",
        "__factorsDone": "1" if factors_done else "",
    })
    return {
        "categoryId": category_id,
        "method": method,
        "clientItemId": client_id,
        "factorCode": factor,
        "factorCodeSecondary": "",
        "item": label,
        "quantity": quantity,
        "unit": unit,
        "spend": packed.get("spend", ""),
        "supplier": packed.get("supplier", ""),
        "values": packed,
    }


def main() -> None:
    load_env()

    cat2 = {
        "item": "",
        "assetClass": "",
        "yearAcquired": "2025",
        "quantity": "",
        "unit": "",
        "spend": "",
        "currency": "",
        "supplier": "",
        "supplierEmail": "",
        "primarySharePct": "",
        "fxRate": "",
    }
    cat3 = {
        "activityType": "",
        "energyCarrier": "Grid electricity",
        "quantity": "",
        "unit": "kWh",
        "gridRegion": "India",
        "supplier": "",
        "supplierEmail": "",
    }
    cat4 = {
        "item": "Inbound equipment / EPC freight — mass, distance, and spend not disclosed in the FY 2025-26 report",
        "fuelType": "",
        "fuelQuantity": "",
        "fuelUnit": "",
        "vehicleType": "",
        "cargoMass": "",
        "massUnit": "",
        "distance": "",
        "distanceUnit": "",
        "mode": "",
        "origin": "",
        "destination": "",
        "spend": "",
        "currency": "",
        "serviceType": "",
    }
    cat5 = {
        "wasteType": "",
        "quantity": "",
        "unit": "Tonnes",
        "treatmentMethod": "Recycling",
        "treatmentProvider": "",
        "supplierEmail": "",
    }
    cat6 = {
        "item": "Business travel — trips, distance, cabin class, and spend not disclosed in the FY 2025-26 report",
        "mode": "",
        "fuelType": "",
        "fuelQuantity": "",
        "fuelUnit": "",
        "cabinClass": "",
        "distance": "",
        "distanceUnit": "",
        "trips": "",
        "origin": "",
        "destination": "",
        "spend": "",
        "currency": "",
    }
    cat7 = {
        "item": "All employees",
        "mode": "",
        "fuelQuantity": "",
        "fuelUnit": "",
        "employeesSurveyed": "",
        "employees": "",
        "oneWayKm": "",
        "commutingDays": "",
        "headcount": "323",
        "officeDaysPerWeek": "",
        "region": "India — Mumbai HQ and 60+ project sites",
    }

    activity_items = [
        item(
            "c2-1", 2, "average-data", "2",
            "Module mounting structures (MMS-FT)",
            "5123.06", "Tonnes",
            values(cat2, {
                "item": "Module mounting structures (MMS-FT)",
                "assetClass": "Other",
                "quantity": "5123.06",
                "unit": "Tonnes",
            }),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c2-2", 2, "average-data", "",
            "Solar modules",
            "91.46", "Units",
            values(cat2, {
                "item": "Solar modules — 91.46 MWp as reported; mass and spend not disclosed so kg CO2e/kg cannot be applied yet",
                "assetClass": "Machinery",
                "quantity": "91.46",
                "unit": "Units",
            }),
            activity_done=True, method_done=True, factors_done=False,
        ),
        item(
            "c2-3", 2, "average-data", "",
            "Wind turbine generators",
            "5", "Units",
            values(cat2, {
                "item": "Wind turbine generators",
                "assetClass": "Machinery",
                "quantity": "5",
                "unit": "Units",
            }),
            activity_done=True, method_done=True, factors_done=False,
        ),
        item(
            "c2-4", 2, "average-data", "",
            "Central inverters, SCADA, PPC and module cleaning systems",
            "85", "Units",
            values(cat2, {
                "item": "Central inverters, SCADA, PPC and module cleaning systems",
                "assetClass": "Machinery",
                "quantity": "85",
                "unit": "Units",
            }),
            activity_done=True, method_done=True, factors_done=False,
        ),
        item(
            "c2-5", 2, "average-data", "",
            "LT/HT cables, transformers, HT panels and string combiner boxes",
            "1438094", "Units",
            values(cat2, {
                "item": "LT/HT cables, transformers, HT panels and string combiner boxes — report mixes metres and counts",
                "assetClass": "Other",
                "quantity": "1438094",
                "unit": "Units",
            }),
            activity_done=True, method_done=True, factors_done=False,
        ),
        item(
            "c3-1", 3, "average-data", "c3-td",
            "T&D losses — head office purchased electricity",
            "228169", "kWh",
            values(cat3, {
                "activityType": "T&D losses",
                "quantity": "228169",
                "energyCarrier": "Grid electricity",
            }),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c3-2", 3, "average-data", "c3-td",
            "T&D losses — company-operated project sites",
            "1992958", "kWh",
            values(cat3, {
                "activityType": "T&D losses",
                "quantity": "1992958",
                "energyCarrier": "Grid electricity",
            }),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c4-1", 4, "distance-based", "",
            cat4["item"],
            "", "",
            cat4,
            activity_done=False, method_done=True, factors_done=False,
        ),
        item(
            "c5-1", 5, "waste-type", "c5-recycle",
            "Paper and cardboard",
            "0.198", "Tonnes",
            values(cat5, {"wasteType": "Paper and cardboard", "quantity": "0.198"}),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c5-2", 5, "waste-type", "c5-recycle",
            "Carton waste",
            "2.4", "Tonnes",
            values(cat5, {"wasteType": "Paper and cardboard", "quantity": "2.4"}),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c5-3", 5, "waste-type", "c5-recycle",
            "Iron scrap",
            "11.28", "Tonnes",
            values(cat5, {"wasteType": "Metal", "quantity": "11.28"}),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c5-4", 5, "waste-type", "c5-recycle",
            "Wooden pallets (used/broken)",
            "320.09", "Tonnes",
            values(cat5, {
                "wasteType": "Mixed industrial",
                "quantity": "320.09",
                "treatmentMethod": "Recycling",
                "treatmentProvider": "Sankhari 240 MW project waste; treatment not split in the report, recycling assumed from circularity disclosure",
            }),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c5-5", 5, "waste-type", "c5-recycle",
            "Hazardous waste (oil, e-waste, batteries, contaminated materials)",
            "0.81", "Tonnes",
            values(cat5, {
                "wasteType": "Hazardous",
                "quantity": "0.81",
                "treatmentMethod": "Recycling",
                "treatmentProvider": "Authorized recycler",
            }),
            activity_done=True, method_done=True, factors_done=True,
        ),
        item(
            "c6-1", 6, "distance-based", "",
            cat6["item"],
            "", "",
            cat6,
            activity_done=False, method_done=True, factors_done=False,
        ),
        item(
            "c7-1", 7, "average-data", "c7-avg",
            "All employees",
            "323", "",
            cat7,
            activity_done=True, method_done=True, factors_done=True,
        ),
    ]

    justifications = {
        1: "Purchased goods were not quantified separately from capital goods in the FY 2025-26 report. The materials table is treated as Category 2.",
        4: "Assessed by HREPL. Cargo mass, lane distance, mode, and freight spend were not disclosed. Left incomplete pending logistics data.",
        6: "Assessed by HREPL. Air/rail/car distance, cabin class, trips, and travel spend were not disclosed. Left incomplete pending travel records.",
        8: "Office and site electricity is already in Scope 2 under operational control.",
        9: "HREPL sells electricity, not physical goods requiring third-party downstream transport after sale.",
        10: "Renewable electricity is not an intermediate product processed by customers.",
        11: "Use-phase emissions of sold renewable electricity are not applicable (no combustion in use).",
        12: "No decommissioned panels or end-of-life policy in FY 2025-26.",
        13: "HREPL is not a lessor of energy-using assets outside the operational-control inventory.",
        14: "HREPL does not operate franchises.",
        15: "Operating renewable assets are already in Scope 1 and 2 under operational control; no investee inventory was published.",
    }

    selections = []
    for category_id in range(1, 16):
        if category_id in {2, 3, 4, 5, 6, 7}:
            status = "included"
        else:
            status = "not_applicable"
        selections.append({
            "categoryId": category_id,
            "status": status,
            "justification": justifications.get(category_id, ""),
        })

    company_data = {
        "sessionKey": SESSION_KEY,
        "name": "Hinduja Renewables Energy Private Limited",
        "industry": "Energy",
        "reportingYear": 2025,
        "headquarters": "Mumbai, Maharashtra, India",
        "boundary": "operational",
    }

    existing = find_company()
    if existing:
        saved = request("PATCH", f"/companies/{existing['id']}", company_data)
        company_id = (saved.get("doc") or existing).get("id")
        action = "updated"
    else:
        saved = request("POST", "/companies", company_data)
        company_id = (saved.get("doc") or saved).get("id")
        action = "created"
    if company_id is None:
        raise SystemExit("Could not save company")

    replace_children("category-selections", str(company_id), selections)
    replace_children("activity-items", str(company_id), activity_items)

    # tCO2e from calculator rules:
    # MMS 5123.06 t * 2.10 kg/kg = 10,758.426
    # T&D 228,169 * 0.018 / 1000 = 4.107; 1,992,958 * 0.018 / 1000 = 35.873
    # Waste recycled tonnes * 21 / 1000 = 7.030
    # Commute 323 * 1.40 = 452.2
    total = 10758.426 + 4.107 + 35.873 + 7.030 + 452.2
    by_category = [
        {"id": 2, "name": "Capital goods", "tco2e": 10758.426, "completeCount": 1},
        {"id": 3, "name": "Fuel- and energy-related activities", "tco2e": 39.98, "completeCount": 2},
        {"id": 4, "name": "Upstream transportation and distribution", "tco2e": 0, "completeCount": 0},
        {"id": 5, "name": "Waste generated in operations", "tco2e": 7.03, "completeCount": 5},
        {"id": 6, "name": "Business travel", "tco2e": 0, "completeCount": 0},
        {"id": 7, "name": "Employee commuting", "tco2e": 452.2, "completeCount": 1},
    ]
    result_rows = list_children("inventory-results", str(company_id))
    result_data = {
        "company": company_id,
        "year": 2025,
        "totalTco2e": total,
        "byCategory": by_category,
        "dataQualityPct": 0,
    }
    if result_rows:
        request("PATCH", f"/inventory-results/{result_rows[0]['id']}", result_data)
    else:
        request("POST", "/inventory-results", result_data)

    print(f"HREPL FY2025-26 inventory {action}")
    print(f"Included categories: 2, 3, 4, 5, 6, 7")
    print(f"Activity items saved: {len(activity_items)}")
    print("Category 4 and 6 left incomplete (no mass-distance or travel data in the report)")
    print(f"Calculated complete items total tCO2e: {total:.1f}")


if __name__ == "__main__":
    main()
