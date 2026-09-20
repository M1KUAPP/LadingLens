import base64
import json
import os
from pathlib import Path
import statistics
import time
import pymupdf
import requests

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY")
TYPESAFE_KEY = os.environ.get("TYPESAFE_API_KEY")
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ATTACHMENTS_DIR = REPO_ROOT / "data" / "sdoc-hackathon-bundle" / "attachments"


def get_b64_image(pdf_path: Path) -> str:
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap()
    return base64.b64encode(pix.tobytes("png")).decode("utf-8")


def extract_single_doc(b64_img: str, doc_type: str = "Bill of Lading"):
    t0 = time.perf_counter()
    payload = {
        "model": "google/gemini-3.5-flash-lite",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Extract JSON with fields (bl_number, shipper, consignee, notify_party, pol, pod, weight, container_count, vessel) from this {doc_type}:",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_img}"},
                    },
                ],
            }
        ],
        "max_tokens": 400,
    }
    res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    t1 = time.perf_counter()
    return t1 - t0, res.status_code, res.json() if res.status_code == 200 else res.text


def extract_both_docs_one_call(bl_img: str, si_img: str):
    t0 = time.perf_counter()
    payload = {
        "model": "google/gemini-3.5-flash-lite",
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract JSON with two keys: 'bl' and 'si', each having fields (bl_number, shipper, consignee, notify_party, pol, pod, weight, container_count, vessel) from these two documents. First is BL, second is SI:",
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{bl_img}"},
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{si_img}"},
                    },
                ],
            }
        ],
        "max_tokens": 600,
    }
    res = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    t1 = time.perf_counter()
    return t1 - t0, res.status_code, res.json() if res.status_code == 200 else res.text


def run_jev_comparison(bl_data: dict, si_data: dict):
    t0 = time.perf_counter()
    payload = {
        "state": f"Bill of Lading data: {json.dumps(bl_data)}\nShipping Instruction data: {json.dumps(si_data)}",
        "model": "jev-latest",
        "questions": {
            "match_shipper": {
                "type": "noul",
                "instructions": "Do the shipper names and addresses match between the BL and SI?",
            },
            "match_consignee": {
                "type": "noul",
                "instructions": "Do the consignee names and addresses match between the BL and SI?",
            },
            "match_pol": {
                "type": "noul",
                "instructions": "Does the Port of Loading match?",
            },
            "match_pod": {
                "type": "noul",
                "instructions": "Does the Port of Discharge match?",
            },
        },
    }
    res = requests.post(
        "https://api.typesafe.ai/v1/systemone",
        headers={
            "Authorization": f"Bearer {TYPESAFE_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    t1 = time.perf_counter()
    return t1 - t0, res.status_code, res.json() if res.status_code == 200 else res.text


def stats(data: list[float]) -> dict:
    data_s = sorted(data)
    p50 = statistics.median(data_s)
    idx95 = int(len(data_s) * 0.95)
    p95 = data_s[min(idx95, len(data_s) - 1)]
    return {
        "mean": statistics.mean(data),
        "min": min(data),
        "max": max(data),
        "p50": p50,
        "p95": p95,
    }


def main():
    bl_path = ATTACHMENTS_DIR / "email_512_BL.pdf"
    si_path = ATTACHMENTS_DIR / "email_512_SI.pdf"

    print("Rendering test PDFs...")
    bl_b64 = get_b64_image(bl_path)
    si_b64 = get_b64_image(si_path)

    sample_bl = {
        "shipper": "APRIL FAREAST (M) SDN BHD",
        "consignee": "AL GURG STATIONERY LLC",
        "pol": "NHAVA SHEVA, INDIA",
        "pod": "TUTICORIN, INDIA",
    }
    sample_si = {
        "shipper": "APRIL FAREAST (M) SDN BHD",
        "consignee": "AL GURG STATIONERY LLC",
        "pol": "NHAVA SHEVA, INDIA",
        "pod": "TUTICORIN, INDIA",
    }

    print("Benchmarking 10 runs of single-doc extraction...")
    single_times = [extract_single_doc(bl_b64)[0] for _ in range(10)]

    print("Benchmarking 10 runs of dual-doc extraction (single prompt)...")
    both_times = [extract_both_docs_one_call(bl_b64, si_b64)[0] for _ in range(10)]

    print("Benchmarking 10 runs of Jev decision layer...")
    jev_times = [run_jev_comparison(sample_bl, sample_si)[0] for _ in range(10)]

    print("\n--- RESULTS ---")
    print("Single doc stats:", stats(single_times))
    print("Dual doc stats:  ", stats(both_times))
    print("Jev stats:       ", stats(jev_times))


if __name__ == "__main__":
    main()
