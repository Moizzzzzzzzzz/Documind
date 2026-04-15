"""End-to-end test: upload → S3, index → Pinecone, chat → RAG, verify bucket."""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
found = load_dotenv(dotenv_path=env_path, override=True)
print(f"[DIAG] .env loaded={found}  path={env_path}", flush=True)

# Mask and print every credential so we can see what's present vs blank
for var in [
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET", "S3_ENDPOINT_URL",
    "PINECONE_API_KEY", "PINECONE_INDEX_NAME",
    "REDIS_URL", "GOOGLE_API_KEY",
]:
    val = os.getenv(var, "")
    if val:
        masked = val[:6] + "..." + val[-3:] if len(val) > 9 else "***set***"
    else:
        masked = "*** MISSING / EMPTY ***"
    print(f"[DIAG]   {var:30s} = {masked}", flush=True)

# Direct boto3 smoke-test (bypasses the server entirely)
print("[DIAG] Direct boto3 test ...", flush=True)
try:
    import boto3 as _boto3
    _s3 = _boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL") or None,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID") or None,
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY") or None,
    )
    _bucket = os.getenv("S3_BUCKET", "documind-uploads")
    _s3.list_objects_v2(Bucket=_bucket, MaxKeys=1)
    print("[DIAG] Direct boto3 OK — credentials work.", flush=True)
except Exception as _e:
    print(f"[DIAG] Direct boto3 FAIL — {type(_e).__name__}: {_e}", flush=True)

PORT = 8001
BASE = f"http://localhost:{PORT}"

# Kill any stale process holding PORT (leftover from a previous test run whose
# monitor was force-stopped before srv.terminate() could execute).
import subprocess as _sp
_result = _sp.run(
    f'for /f "tokens=5" %p in (\'netstat -ano ^| findstr ":{PORT}.*LISTENING"\') do taskkill /PID %p /F',
    shell=True, capture_output=True, text=True
)
if _result.stdout.strip():
    print(f"[DIAG] Killed stale process on port {PORT}: {_result.stdout.strip()}", flush=True)
else:
    print(f"[DIAG] No stale process on port {PORT}.", flush=True)

# ── helpers ──────────────────────────────────────────────────────────────────

def log(tag, msg):
    print(f"[{tag}] {msg}", flush=True)


def http_json(url, payload_dict=None, filepath=None):
    """POST JSON or multipart; returns parsed response dict."""
    if filepath:
        boundary = "DocuMindE2EBoundary"
        filename = os.path.basename(filepath)
        with open(filepath, "rb") as f:
            file_bytes = f.read()
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode() + file_bytes + f"\r\n--{boundary}--\r\n".encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    else:
        body = json.dumps(payload_dict).encode()
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("Content-Type", "application/json")
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read())


# ── start server ─────────────────────────────────────────────────────────────

log("BOOT", "Starting uvicorn on port 8001 ...")
srv = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app",
     "--host", "0.0.0.0", "--port", str(PORT)],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    text=True, env={**os.environ},
)

def _stream():
    for line in srv.stdout:
        print(f"  [SERVER] {line.rstrip()}", flush=True)

threading.Thread(target=_stream, daemon=True).start()

for _ in range(40):
    try:
        urllib.request.urlopen(f"{BASE}/health", timeout=2)
        log("BOOT", "Server is up.")
        break
    except Exception:
        time.sleep(3)
else:
    log("BOOT", "FATAL — server never became healthy.")
    srv.terminate()
    sys.exit(1)

results = {}

# ── TEST 1: upload PDF ────────────────────────────────────────────────────────
log("TEST-1", "Uploading PDF via POST /api/upload ...")
pdf_path = None
for candidate in [
    "data/uploads/Abdul Moizz - Resume (1).pdf",
    "data/uploads/Moizz_Khan_Resume.pdf",
    "data/uploads/AutoAnalyst_Report_77a8f001-9e8c-46c4-ac2b-233049cac7f1.pdf",
]:
    if os.path.exists(candidate):
        pdf_path = candidate
        break

if not pdf_path:
    # Minimal valid PDF (no external libs needed)
    pdf_path = "data/uploads/_e2e_test.pdf"
    os.makedirs("data/uploads", exist_ok=True)
    with open(pdf_path, "wb") as f:
        content = b"BT /F1 12 Tf 72 720 Td (DocuMind E2E Test. RAG pipeline verification.) Tj ET\n"
        header = b"%PDF-1.4\n"
        obj1 = b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        obj2 = b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        obj3 = b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        obj4 = (b"4 0 obj<</Length " + str(len(content)).encode() + b">>\nstream\n" + content + b"endstream endobj\n")
        obj5 = b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
        xref_pos = len(header + obj1 + obj2 + obj3 + obj4 + obj5)
        trailer = (b"xref\n0 6\n0000000000 65535 f \n"
                   + b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n"
                   + str(xref_pos).encode() + b"\n%%EOF\n")
        f.write(header + obj1 + obj2 + obj3 + obj4 + obj5 + trailer)
    log("TEST-1", f"No existing PDFs found — created minimal test PDF at {pdf_path}")

try:
    res = http_json(f"{BASE}/api/upload", filepath=pdf_path)
    s3_key = res.get("s3_key", "MISSING")
    chunks  = res.get("chunk_count", 0)
    log("TEST-1", f"PASS  chunk_count={chunks}  s3_key={s3_key}")
    log("TEST-1", f"Full response: {json.dumps(res, indent=2)}")
    results["upload"] = f"PASS  s3_key={s3_key}  chunks={chunks}"
except urllib.error.HTTPError as e:
    body = e.read().decode()
    log("TEST-1", f"FAIL  HTTP {e.code}: {body}")
    results["upload"] = f"FAIL HTTP {e.code}"
except Exception as e:
    log("TEST-1", f"FAIL  {type(e).__name__}: {e}")
    results["upload"] = f"FAIL {e}"

# ── TEST 2: /api/chat RAG ────────────────────────────────────────────────────
log("TEST-2", "POST /api/chat — RAG query ...")
try:
    res = http_json(f"{BASE}/api/chat", payload_dict={
        "session_id": "e2e-session-001",
        "query": "What is this document about? Summarise briefly.",
        "top_k": 3,
    })
    answer  = res.get("answer", res.get("response", str(res)))
    sources = res.get("sources", res.get("chunks", []))
    log("TEST-2", f"PASS  answer (first 300 chars): {answer[:300]}")
    log("TEST-2", f"Sources returned: {len(sources)}")
    for i, s in enumerate(sources[:3], 1):
        m = s.get("metadata", {})
        log("TEST-2", f"  [{i}] file={m.get('source_file','?')}  "
                      f"page={m.get('page_number','?')}  "
                      f"s3_key={m.get('s3_key','?')}")
    results["chat"] = "PASS"
except urllib.error.HTTPError as e:
    body = e.read().decode()
    log("TEST-2", f"FAIL  HTTP {e.code}: {body}")
    results["chat"] = f"FAIL HTTP {e.code}"
except Exception as e:
    log("TEST-2", f"FAIL  {type(e).__name__}: {e}")
    results["chat"] = f"FAIL {e}"

# ── TEST 3: Pinecone vector count ────────────────────────────────────────────
log("TEST-3", "Querying Pinecone index stats ...")
try:
    from pinecone import Pinecone
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    idx_name = os.getenv("PINECONE_INDEX_NAME", "documind")
    idx = pc.Index(idx_name)
    stats = idx.describe_index_stats()
    total = getattr(stats, "total_vector_count", "?")
    log("TEST-3", f"PASS  index='{idx_name}'  total_vector_count={total}")
    results["pinecone"] = f"PASS vectors={total}"
except Exception as e:
    log("TEST-3", f"FAIL  {type(e).__name__}: {e}")
    results["pinecone"] = f"FAIL {e}"

# ── TEST 4: DO Spaces / S3 bucket listing ────────────────────────────────────
log("TEST-4", "Listing S3/DO Spaces bucket contents ...")
try:
    import boto3
    s3 = boto3.client(
        "s3",
        endpoint_url=os.getenv("S3_ENDPOINT_URL"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )
    bucket = os.getenv("S3_BUCKET", "documind-uploads")
    resp   = s3.list_objects_v2(Bucket=bucket, Prefix="uploads/")
    objs   = resp.get("Contents", [])
    log("TEST-4", f"Objects in s3://{bucket}/uploads/ : {len(objs)}")
    for obj in objs[-5:]:
        log("TEST-4", f"  {obj['Key']}  {obj['Size']} bytes  {obj['LastModified']}")
    results["s3"] = f"PASS objects={len(objs)}"
except Exception as e:
    log("TEST-4", f"FAIL  {type(e).__name__}: {e}")
    results["s3"] = f"FAIL {e}"

# ── summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60, flush=True)
print("E2E RESULT SUMMARY", flush=True)
print("=" * 60, flush=True)
for k, v in results.items():
    status = "PASS" if v.startswith("PASS") else "FAIL"
    print(f"  [{status}] {k:12s} {v}", flush=True)
print("=" * 60, flush=True)

srv.terminate()
