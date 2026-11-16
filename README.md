# Bill Snap

Mobile-first Progressive Web App that captures a bill, checks that the photo is actually a receipt, extracts merchant, date, total and category, then stores verified bills on the device.

## What it does

- Capture with the phone camera or upload from the gallery
- OCR with Tesseract.js in the browser
- Vision-model bill vs non-bill detection through a small Express API (Gemini)
- Structured extraction of merchant, date, total amount and category
- Evidence-based confidence (high / medium / low) plus manual correction
- IndexedDB storage with Dexie so data survives refresh and browser restart
- History search/filter and monthly analytics from **saved** bills only

The browser never receives `GEMINI_API_KEY`. If the key is missing, the app shows a configuration message and does not invent extraction results.

## Architecture

```
React PWA  →  Tesseract OCR  →  POST /api/analyze  →  Gemini Vision
     ↓                              ↓
 Dexie IndexedDB              structured JSON
```

OCR reads characters. The vision model looks at the whole image (layout, faces, ID cards, scenery) so a selfie is rejected even if Tesseract reads a few words.

## Requirements

- Node.js 20+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Setup

```bash
cd backend
cp .env.example .env          # macOS / Linux
# copy .env.example .env      # Windows
# edit backend/.env and set GEMINI_API_KEY=your_key

cd ../frontend
npm install

cd ../backend
npm install

cd ..
npm install
npm run dev
```

Then open `http://localhost:5173`.

- Frontend: Vite on port 5173 (proxies `/api` to the backend)
- Backend: Express on port 3001

On a phone, use the same Wi-Fi address as your computer (`http://<lan-ip>:5173`). Camera access needs HTTPS or `localhost`.

## Production build

```bash
npm run build
```

Serve `frontend/dist` behind any static host and run `npm start --prefix backend` for the API. Point the frontend at the API with a reverse proxy on `/api`.

## PWA

The app is installable from the browser. Saved bills live in IndexedDB, not in the service worker cache.

## Testing the 20-image dataset

1. Put images in `tests/dataset/` using the names in `tests/dataset/README.md`.
2. Fill expected merchant/date/amount/category in `tests/expected.csv`.
3. From `backend/`: `npm run eval`
4. Open `tests/results.csv`. Accuracy prints only when all 20 images exist and expected labels are filled.

Do not invent predicted values. The template in `tests/results_template.csv` stays blank until a real run.

## Project layout

```
frontend/src/
  components/  pages/  services/  hooks/  database/  utils/  types/  assets/
backend/src/
  index.ts     Express server
  analyze.ts   Gemini vision call
  schema.ts    Zod JSON contract
  eval.ts      dataset runner
```

## Interview notes

See [INTERVIEW.md](INTERVIEW.md) for architecture, OCR vs computer vision, confidence scoring, IndexedDB, limitations, and likely questions.
