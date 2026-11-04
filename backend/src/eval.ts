import "dotenv/config";
import { createWorker } from "tesseract.js";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeBill, isGeminiConfigured } from "./analyze";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const datasetDir = path.join(root, "tests", "dataset");
const expectedPath = path.join(root, "tests", "expected.csv");
const outputPath = path.join(root, "tests", "results.csv");

const HEADER = [
  "Image ID",
  "Image Type",
  "Expected Classification",
  "Predicted Classification",
  "Detection Correct?",
  "Merchant Expected",
  "Merchant Predicted",
  "Merchant Correct?",
  "Date Expected",
  "Date Predicted",
  "Date Correct?",
  "Amount Expected",
  "Amount Predicted",
  "Amount Correct?",
  "Category Expected",
  "Category Predicted",
  "Category Correct?",
  "Failure Reason",
];

interface ExpectedRow {
  imageId: string;
  imageType: string;
  expectedClassification: string;
  merchantExpected: string;
  dateExpected: string;
  amountExpected: string;
  categoryExpected: string;
}

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function yesNo(expected: string, predicted: string): string {
  if (!expected) return "";
  return same(expected, predicted) ? "Y" : "N";
}

async function findImage(imageId: string): Promise<string | null> {
  const files = await readdir(datasetDir).catch(() => []);
  const match = files.find((file) => path.parse(file).name === imageId);
  return match ? path.join(datasetDir, match) : null;
}

async function ocrFile(filePath: string): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(filePath);
    return { text: data.text?.trim() ?? "", confidence: data.confidence ?? 0 };
  } finally {
    await worker.terminate();
  }
}

async function main() {
  if (!isGeminiConfigured()) {
    console.error("GEMINI_API_KEY is missing. Fill backend/.env before running evaluation.");
    process.exitCode = 1;
    return;
  }

  const expectedRaw = await readFile(expectedPath, "utf8");
  const rows = parseCsv(expectedRaw).slice(1);
  const expected: ExpectedRow[] = rows.map((cols) => ({
    imageId: cols[0] ?? "",
    imageType: cols[1] ?? "",
    expectedClassification: cols[2] ?? "",
    merchantExpected: cols[5] ?? "",
    dateExpected: cols[8] ?? "",
    amountExpected: cols[11] ?? "",
    categoryExpected: cols[14] ?? "",
  }));

  const output: string[][] = [HEADER];
  let tested = 0;
  let missingImages = 0;

  for (const row of expected) {
    if (!row.imageId) continue;
    const imagePath = await findImage(row.imageId);
    if (!imagePath) {
      missingImages += 1;
      output.push([
        row.imageId,
        row.imageType,
        row.expectedClassification,
        "",
        "",
        row.merchantExpected,
        "",
        "",
        row.dateExpected,
        "",
        "",
        row.amountExpected,
        "",
        "",
        row.categoryExpected,
        "",
        "",
        "Image file not found in tests/dataset",
      ]);
      continue;
    }

    tested += 1;
    console.log(`Evaluating ${row.imageId}...`);
    try {
      const image = await readFile(imagePath);
      const ocr = await ocrFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const result = await analyzeBill({
        imageBase64: image.toString("base64"),
        mimeType,
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
      });

      const predictedClass = result.isBill ? "bill" : "non-bill";
      const merchantPredicted = result.isBill ? (result.merchant.value ?? "") : "";
      const datePredicted = result.isBill ? (result.date.value ?? "") : "";
      const amountPredicted =
        result.isBill && result.totalAmount.value !== null ? String(result.totalAmount.value) : "";
      const categoryPredicted = result.isBill ? (result.category.value ?? "") : "";
      const detectionCorrect = yesNo(row.expectedClassification, predictedClass);

      const failures: string[] = [];
      if (detectionCorrect === "N") failures.push("Detection mismatch");
      if (row.merchantExpected && yesNo(row.merchantExpected, merchantPredicted) === "N") {
        failures.push("Merchant mismatch");
      }
      if (row.dateExpected && yesNo(row.dateExpected, datePredicted) === "N") failures.push("Date mismatch");
      if (row.amountExpected && yesNo(row.amountExpected, amountPredicted) === "N") {
        failures.push("Amount mismatch");
      }
      if (row.categoryExpected && yesNo(row.categoryExpected, categoryPredicted) === "N") {
        failures.push("Category mismatch");
      }
      if (!result.isBill) failures.push(result.reason);

      output.push([
        row.imageId,
        row.imageType,
        row.expectedClassification,
        predictedClass,
        detectionCorrect,
        row.merchantExpected,
        merchantPredicted,
        yesNo(row.merchantExpected, merchantPredicted),
        row.dateExpected,
        datePredicted,
        yesNo(row.dateExpected, datePredicted),
        row.amountExpected,
        amountPredicted,
        yesNo(row.amountExpected, amountPredicted),
        row.categoryExpected,
        categoryPredicted,
        yesNo(row.categoryExpected, categoryPredicted),
        failures.filter(Boolean).join("; "),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown evaluation error";
      output.push([
        row.imageId,
        row.imageType,
        row.expectedClassification,
        "",
        "",
        row.merchantExpected,
        "",
        "",
        row.dateExpected,
        "",
        "",
        row.amountExpected,
        "",
        "",
        row.categoryExpected,
        "",
        "",
        message,
      ]);
    }
  }

  const csv = output.map((line) => line.map(csvEscape).join(",")).join("\n");
  await writeFile(outputPath, `${csv}\n`, "utf8");
  console.log(`Wrote ${outputPath}`);
  console.log(`Images tested: ${tested}. Missing images: ${missingImages}.`);

  const dataRows = output.slice(1);
  const complete = dataRows.filter((line) => line[2] && line[3] && line[4]);
  if (complete.length < 20) {
    console.log("Accuracy is not reported yet. Add all 20 dataset images and expected labels, then rerun.");
    return;
  }

  const ratio = (column: number, onlyBills = false) => {
    const subset = complete.filter((line) => !onlyBills || line[3] === "bill");
    const scored = subset.filter((line) => line[column] === "Y" || line[column] === "N");
    if (!scored.length) return "n/a";
    const yes = scored.filter((line) => line[column] === "Y").length;
    return `${((yes / scored.length) * 100).toFixed(1)}% (${yes}/${scored.length})`;
  };

  console.log("Bill detection accuracy:", ratio(4));
  console.log("Merchant extraction accuracy:", ratio(7, true));
  console.log("Date extraction accuracy:", ratio(10, true));
  console.log("Amount extraction accuracy:", ratio(13, true));
  console.log("Category accuracy:", ratio(16, true));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
