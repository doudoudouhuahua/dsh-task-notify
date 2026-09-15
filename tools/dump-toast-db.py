"""
Inspect the recent Windows toast notifications and report, for each one, the
image source Windows recorded.

Why this exists: the toast icon has exactly one silent failure mode. BurntToast's
`New-BTImage` declares `[string] $Source = $Script:DefaultImage`, and
`New-BurntToastNotification` calls it without `-Source` whenever its `-AppLogo`
argument is empty. The module's own picture is then baked into the toast, and
`New-BurntToastNotification` still exits 0 — so the plugin sees success while the
logo is silently replaced.

Every toast whose image is `...\\BurntToast\\1.1.0\\Images\\BurntToast.png` failed
that way; every toast carrying the plugin's own path passed the argument.

Usage:
    python tools/dump-toast-db.py [count]     (default 12, newest first)

Reads a COPY of wpndatabase.db; the live file is locked by the OS. Timestamps
are stored as Windows FILETIME (UTC) and printed in local time (UTC+8).
"""
import datetime
import os
import re
import shutil
import sqlite3
import sys
import tempfile

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

LIMIT = int(sys.argv[1]) if len(sys.argv) > 1 else 12
SRC = os.path.join(os.environ["LOCALAPPDATA"], "Microsoft", "Windows", "Notifications", "wpndatabase.db")
TMP = os.path.join(tempfile.gettempdir(), "wpndump.db")

# The database runs in WAL mode: recent notifications live in the -wal sidecar
# until a checkpoint folds them into the main file. Copying only wpndatabase.db
# therefore reports a stale history, so every part is copied together.
for suffix in ("", "-wal", "-shm"):
    try:
        shutil.copyfile(SRC + suffix, TMP + suffix)
    except OSError:
        try:
            os.remove(TMP + suffix)
        except OSError:
            pass

con = sqlite3.connect(TMP)
con.row_factory = sqlite3.Row
cur = con.cursor()
cur.execute("""
    SELECT n.ArrivalTime, h.PrimaryId AS app, n.Payload
    FROM Notification n
    LEFT JOIN NotificationHandler h ON h.RecordId = n.HandlerId
    ORDER BY n.ArrivalTime DESC
    LIMIT ?
""", (LIMIT,))
rows = cur.fetchall()


def local(ft):
    if not ft:
        return "?"
    return (datetime.datetime(1601, 1, 1)
            + datetime.timedelta(microseconds=int(ft) // 10)
            + datetime.timedelta(hours=8)).strftime("%Y/%m/%d %H:%M:%S")


print(f"{len(rows)} newest toasts (local time)\n")
fallbacks = 0
for r in rows:
    payload = r["Payload"]
    if isinstance(payload, memoryview):
        payload = payload.tobytes()
    if isinstance(payload, bytes):
        payload = payload.decode("utf-8", "replace")
    texts = re.findall(r"<text[^>]*>(.*?)</text>", payload or "", re.S)
    images = re.findall(r'<image[^>]*src="(.*?)"', payload or "", re.S)
    if any("BurntToast.png" in i for i in images):
        fallbacks += 1
        tag = "FALLBACK"
    elif images:
        tag = "ok"
    else:
        tag = "no-image"
    print(f"--- {local(r['ArrivalTime'])}  [{tag}]")
    for t in texts:
        print(f"    text : {t.strip()}")
    for i in images:
        print(f"    image: {i}")

con.close()
for suffix in ("", "-wal", "-shm"):
    try:
        os.remove(TMP + suffix)
    except OSError:
        pass

print(f"\n{fallbacks} of {len(rows)} toasts fell back to BurntToast's own image.")
