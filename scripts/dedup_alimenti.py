"""
Bonifica DB alimenti — deduplicazione
Uso:
  python3 scripts/dedup_alimenti.py          # dry-run: mostra cosa eliminerebbe
  python3 scripts/dedup_alimenti.py --delete # esegue i DELETE dopo conferma
"""

import sys, re, json, urllib.request, urllib.parse, io
from collections import defaultdict

# Forza UTF-8 su Windows per evitare errori cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SUPABASE_URL = "https://dcwchgzxuzfywkxsadjp.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjd2NoZ3p4dXpmeXdreHNhZGpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDAxMDE5OSwiZXhwIjoyMDg5NTg2MTk5fQ.LTFykwESrf1BFBYdAGjjcqAQozNUiexbKnShSqzAPXs"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_all():
    rows = []
    page, page_size = 0, 1000
    while True:
        url = (f"{SUPABASE_URL}/rest/v1/alimenti"
               f"?select=id,product_name,brands,energy_kcal_100g,proteins_100g,"
               f"carbs_100g,fat_100g,fiber_100g,meal_slots,pnns_groups_1"
               f"&limit={page_size}&offset={page * page_size}")
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as r:
            batch = json.loads(r.read())
        rows.extend(batch)
        if len(batch) < page_size:
            break
        page += 1
    return rows

# ── Normalizzazione ───────────────────────────────────────────────────────────

STOPWORDS = {
    "di", "del", "della", "dei", "degli", "delle", "con", "al", "alla",
    "allo", "ai", "agli", "alle", "da", "in", "su", "per", "tra", "fra",
    "il", "lo", "la", "i", "gli", "le", "un", "uno", "una",
    "bio", "organic", "light", "zero", "premium", "classico",
    "extra", "special", "naturale",
}

# Varianti significative da NON deduplicare tra loro
MEANINGFUL_VARIANTS = [
    "senza lattosio", "senza glutine", "intero", "scremato",
    "parzialmente scremato", "semisc", "bianco", "integrale",
    "affumicato", "al naturale", "sott'olio", "in olio",
]

def normalize_name(name: str) -> str:
    s = name.lower().strip()
    # Rimuovi caratteri non alfanumerici tranne spazio
    s = re.sub(r"[''`\-_/\\]", " ", s)
    s = re.sub(r"[^a-zàèéìòùäöü\s]", "", s)
    words = [w for w in s.split() if w not in STOPWORDS and len(w) > 1]
    return " ".join(words[:4])  # prime 4 parole significative

def macro_bucket(row):
    """Arrotonda macro al 20% più vicino per confronto fuzzy."""
    def bucket(v, step=20):
        v = v or 0
        return round(v / step) * step
    return (bucket(row["energy_kcal_100g"]), bucket(row["proteins_100g"]),
            bucket(row["carbs_100g"]), bucket(row["fat_100g"]))

def meaningful_variant_key(name: str) -> str:
    """Estrae le varianti significative dal nome per non deduplicare tra loro."""
    lower = name.lower()
    found = [v for v in MEANINGFUL_VARIANTS if v in lower]
    return "|".join(sorted(found))

# ── Selezione del "campione" da tenere ────────────────────────────────────────

def pick_keeper(group: list[dict]) -> dict:
    """Tiene il record col nome più breve e pulito, o con brand noto."""
    def score(r):
        name = r["product_name"]
        brand = (r.get("brands") or "").lower()
        s = 0
        # Preferisci nomi brevi
        s -= len(name)
        # Preferisci brand noti (non unknown/None)
        if brand and brand not in ("unknown", ""):
            s += 10
        # Preferisci record con fiber compilata
        if r.get("fiber_100g") is not None:
            s += 5
        # Preferisci meal_slots più completo
        s += len(r.get("meal_slots") or "")
        return s
    return max(group, key=score)

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    dry_run = "--delete" not in sys.argv

    print("Scarico alimenti da Supabase...")
    rows = fetch_all()
    print(f"Totale record: {len(rows)}\n")

    # Raggruppa per (nome normalizzato + macro fuzzy + variante significativa)
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for r in rows:
        key = (
            normalize_name(r["product_name"]),
            macro_bucket(r),
            meaningful_variant_key(r["product_name"]),
        )
        groups[key].append(r)

    to_delete: list[str] = []
    summary: list[tuple[str, int, str, list[str]]] = []  # (keeper_name, n_del, reason, deleted_names)

    for key, group in groups.items():
        if len(group) < 2:
            continue

        keeper = pick_keeper(group)
        duplicates = [r for r in group if r["id"] != keeper["id"]]
        del_ids = [r["id"] for r in duplicates]
        del_names = [r["product_name"] for r in duplicates]

        to_delete.extend(del_ids)
        summary.append((keeper["product_name"], len(duplicates), keeper.get("brands") or "–", del_names))

    # Report
    summary.sort(key=lambda x: -x[1])
    print(f"{'='*70}")
    print(f"Record da eliminare: {len(to_delete)}  |  Keeper: {len(rows) - len(to_delete)}")
    print(f"{'='*70}\n")

    for keeper_name, n, brand, del_names in summary:
        print(f"  KEEPER  {keeper_name!r} [{brand}]  ->  elimina {n} duplicati:")
        for dn in del_names[:5]:
            print(f"           - {dn}")
        if len(del_names) > 5:
            print(f"           ... e altri {len(del_names)-5}")
        print()

    print(f"{'='*70}")
    print(f"Totale da eliminare: {len(to_delete)} record su {len(rows)}")
    print(f"Rimarranno: {len(rows) - len(to_delete)} record")

    if dry_run:
        print("\n[DRY RUN] Nessuna modifica eseguita.")
        print("Riesegui con --delete per applicare le eliminazioni.")
        return

    # Conferma (bypassabile con --yes)
    if "--yes" not in sys.argv:
        print()
        confirm = input(f"Confermi l'eliminazione di {len(to_delete)} record? [digita 'SI' per procedere]: ")
        if confirm.strip() != "SI":
            print("Annullato.")
            return

    # Delete a batch di 100 (limite URL)
    print("\nElimino...")
    batch_size = 100
    deleted = 0
    for i in range(0, len(to_delete), batch_size):
        batch = to_delete[i : i + batch_size]
        ids_param = "(" + ",".join(f'"{x}"' for x in batch) + ")"
        url = f"{SUPABASE_URL}/rest/v1/alimenti?id=in.{urllib.parse.quote(ids_param)}"
        req = urllib.request.Request(url, method="DELETE", headers={**HEADERS, "Prefer": "return=minimal"})
        with urllib.request.urlopen(req) as r:
            pass
        deleted += len(batch)
        print(f"  Eliminati {deleted}/{len(to_delete)}...")

    print(f"\nBonifica completata. Eliminati {deleted} record.")

if __name__ == "__main__":
    main()
