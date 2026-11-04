# Bill Snap — interview notes

Use this as a walkthrough for a 20–30 minute technical discussion. Speak from the code, not from memory of this file alone.

## End-to-end flow

1. The user captures or uploads an image.
2. The client compresses it and runs **Tesseract.js** to get raw text plus word-level confidence.
3. Image + OCR text are sent to `POST /api/analyze`.
4. **Gemini Vision** decides `isBill`. If false, the UI stops and shows a polite rejection. Nothing is saved.
5. If it is a bill, Gemini returns merchant, date, total, category and its own confidence.
6. Client **rule-based validation** checks Indian amounts, date format, whether values appear in OCR, and prefers labeled totals over subtotal/tax.
7. Confidence can be **downgraded** when AI says “high” but OCR/rules disagree.
8. The review screen lets the user edit fields. Uncertain fields stay flagged until edited or explicitly confirmed.
9. The verified bill (including the image blob) is stored in **IndexedDB** via Dexie.

## OCR vs computer vision

- **OCR** (Tesseract) maps pixel patterns to characters. It does not understand “this is a selfie.”
- **Computer vision / a vision LLM** looks at the whole scene: paper layout, logos, faces, identity cards, landscapes.
- Bill Snap uses both: OCR for text evidence, Gemini for “is this a receipt?” and for interpreting messy layouts.

## Why a backend exists

Gemini needs a secret API key. Putting that key in Vite (`VITE_*`) would expose it in the browser bundle. Express keeps `GEMINI_API_KEY` on the server and returns only structured JSON.

## Confidence scoring

Not random numbers. For each field we combine:

- Gemini’s stated confidence
- Tesseract overall and word confidence
- Whether the predicted string actually appears in OCR
- Date parse success (`YYYY-MM-DD`, never invent a missing date)
- Amount sanity (numeric, Indian `₹` / `Rs` / commas, labeled TOTAL vs subtotal)

The worse of AI confidence and evidence confidence wins, so a fluent but unsupported guess becomes medium or low.

## Why IndexedDB (Dexie)

- `localStorage` is a small string store (~5MB) and cannot hold receipt images well.
- IndexedDB stores blobs, scales better, and persists across refresh and restart.
- Dexie gives typed tables and simple queries (`merchant`, `category`, `date`).

Service worker cache is for the app shell, not user bills.

## Important files to mention

- `frontend/src/services/ocr.ts` — Tesseract worker
- `frontend/src/utils/validation.ts` and `confidence.ts` — merge + scoring
- `frontend/src/utils/money.ts` — Indian totals
- `frontend/src/database/db.ts` — Dexie schema
- `backend/src/analyze.ts` — Gemini prompt and JSON parse
- `backend/src/schema.ts` — Zod contract

## Limitations and trade-offs

- Blurry, faded, crumpled, or handwritten bills reduce OCR quality; Gemini may still classify them as bills but with low confidence.
- Client-side OCR is slower on large images; we resize before OCR.
- Gemini costs latency and quota; without a key the app refuses to fake results.
- Ambiguous dates (`01/02/26`) are treated as day/month/year (India). That can be wrong for US receipts.
- Duplicate detection is merchant + date + amount, plus a cheap image fingerprint — not a cryptographic hash.
- PWA camera needs HTTPS or localhost; some in-app browsers block `getUserMedia`.
- HEIC from iPhones may fail in some browsers; JPEG/PNG/WebP are the supported path.

## Likely questions

**How do you reject non-bills?**  
Vision model classification first. OCR is supporting evidence, not the detector.

**What if Gemini returns markdown or broken JSON?**  
`analyze.ts` strips fences, slices the first `{...}`, then Zod parses. Parse failures become a user-visible error, not a crash.

**How do you pick the total?**  
Prompt asks for the final payable total. Client also scans OCR for “grand total / amount payable” and can downgrade confidence if the number does not match.

**What happens offline?**  
Saved bills still load from IndexedDB. New AI extraction needs the API. Network errors show a clear message.

**How would you improve it?**  
Server-side OCR for consistency, receipt-specific detection models, EXIF-aware orientation, stronger duplicate hashing, and a labeled 20-image eval after the dataset is supplied.

**Why TypeScript interfaces and Zod?**  
The UI uses shared TypeScript types. The server validates untrusted model output with Zod so a malformed field cannot take down the app.
