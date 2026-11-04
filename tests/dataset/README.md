# Bill Snap test dataset

Place exactly 20 images in this folder. Use these file names (any of `.jpg`, `.jpeg`, `.png`, or `.webp`):

## 15 bills

| Image ID | Image type |
| --- | --- |
| bill_01 | Normal printed receipt |
| bill_02 | Grocery receipt |
| bill_03 | Restaurant receipt |
| bill_04 | Electricity bill |
| bill_05 | Medical receipt |
| bill_06 | Shopping bill |
| bill_07 | Blurry receipt |
| bill_08 | Crumpled receipt |
| bill_09 | Handwritten bill |
| bill_10 | Angled photograph |
| bill_11 | Faded receipt |
| bill_12 | Long receipt |
| bill_13 | Grocery receipt (second sample) |
| bill_14 | Restaurant bill (second sample) |
| bill_15 | Utility or medical bill (second sample) |

## 5 non-bills

| Image ID | Image type |
| --- | --- |
| nonbill_01 | Selfie |
| nonbill_02 | ID card |
| nonbill_03 | Unrelated screenshot |
| nonbill_04 | Landscape |
| nonbill_05 | Random document |

Do not commit personal photos, ID cards, or real addresses if you publish the repo.

After adding images, fill expected merchant/date/amount/category values in `tests/expected.csv`, start the backend with a Gemini key, then run:

```bash
cd backend
npm run eval
```

The runner writes `tests/results.csv`. Accuracy is printed only after all 20 images are present and expected labels are filled. Do not invent predicted values.
