"""Small anonymous read-only source probes, not a production crawler.

No authentication, retries, captcha bypass, or full-text retention. Response
bytes are hashed; only selected factual fields are saved. Each later run uses
a timestamped filename so historical observations are not overwritten.
"""
import concurrent.futures
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

TARGETS = [
    ("openalex", "https://api.openalex.org/works?filter=doi:https://doi.org/10.1038/nature14539&per_page=1&select=id,doi,title,publication_year,cited_by_count,primary_topic,updated_date"),
    ("dblp", "https://dblp.org/search/publ/api?q=attention%20is%20all%20you%20need&h=1&format=json"),
    ("cordis", "https://cordis.europa.eu/project/id/101005435"),
    ("nsf", "https://api.nsf.gov/services/v1/awards.json?id=2040990&printFields=id,title,awardeeName,startDate"),
    ("most-award", "https://www.most.gov.cn/cxfw/kjjlcx/kjjl2025/202607/t20260708_196987.html"),
    ("cnipa-entry", "https://ggfw.cnipa.gov.cn/"),
    ("nsfc-entry", "https://www.nsfc.gov.cn/p1/3281/3286/3304/3348/jhyzczzxmcx.html"),
]

def probe(target):
    source, url = target
    item = {"source": source, "url": url, "observed_at": dt.datetime.now(dt.timezone.utc).isoformat(), "method": "anonymous GET; one request; no retries"}
    request = Request(url, headers={"User-Agent": "CourseResearchSourceCheck/0.1 (read-only single sample)", "Accept": "application/json,text/html;q=0.8"})
    try:
        try:
            response = urlopen(request, timeout=20)
        except HTTPError as error:
            response = error
        with response:
            item.update(http_status=response.status, final_url=response.geturl(), content_type=response.headers.get("Content-Type", ""))
            body = response.read(2_000_001)
        truncated = len(body) > 2_000_000
        body = body[:2_000_000]
        item.update(bytes_read=len(body), body_complete=not truncated, sha256=hashlib.sha256(body).hexdigest())
        text = body.decode("utf-8", errors="replace")
        challenge = bool(re.search(r"Anubis|Access Denied|captcha|验证码|Just a moment", text, re.I))
        item["challenge_detected"] = challenge
        item["business_fields_verified"] = False
        if item["http_status"] == 200 and not challenge and "json" in item["content_type"]:
            data = json.loads(text)
            if source == "openalex":
                rows = data.get("results", [])
                item["sample"] = [{k: row.get(k) for k in ("id", "doi", "title", "publication_year", "cited_by_count", "updated_date")} for row in rows[:1]]
                item["topic_present"] = bool(rows and rows[0].get("primary_topic"))
                item["business_fields_verified"] = bool(rows and rows[0].get("id") and rows[0].get("title"))
            elif source == "dblp":
                rows = data.get("result", {}).get("hits", {}).get("hit", [])
                if isinstance(rows, dict):
                    rows = [rows]
                item["sample"] = [{k: row.get("info", {}).get(k) for k in ("key", "title", "year", "doi", "url")} for row in rows[:1]]
                item["business_fields_verified"] = bool(rows)
            elif source == "nsf":
                rows = data.get("response", {}).get("award", [])
                item["sample"] = [{k: row.get(k) for k in ("id", "title", "awardeeName", "startDate")} for row in rows[:1]]
                item["business_fields_verified"] = bool(rows and rows[0].get("id") and rows[0].get("title"))
        elif item["http_status"] == 200 and not challenge:
            if source == "cordis":
                item["business_fields_verified"] = all(token in text for token in ("101005435", "AMULET"))
                if item["business_fields_verified"]:
                    item["sample"] = {"project_id": "101005435", "acronym": "AMULET"}
            elif source == "most-award":
                item["business_fields_verified"] = all(token in text for token in ("J-256-0-01", "奋斗者号"))
                if item["business_fields_verified"]:
                    item["sample"] = {"award_year": 2025, "announcement_date": "2026-07-08", "project_number": "J-256-0-01", "project_name": "奋斗者号全海深载人潜水器"}
            else:
                item["note"] = "Entry page only; a 200 response does not verify a data download/API or reuse permission."
        item["result"] = "sample_verified" if item["business_fields_verified"] else "not_verified"
    except (URLError, TimeoutError, OSError, ValueError) as error:
        item.update(result="request_failed", error_type=type(error).__name__, error=str(error)[:200])
    return item

if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(probe, TARGETS))
    report = {"scope": "Environment-specific access observation, not legal approval or bulk ingestion proof", "credential_used": False, "observations": results}
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = Path(__file__).with_name(f"access-observations-{stamp}.json")
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
