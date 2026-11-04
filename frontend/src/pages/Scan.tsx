import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { Logo } from "../components/Logo";
import { useCamera } from "../hooks/useCamera";
import { analyzeImage, getHealth } from "../services/analyze";
import { captureFromVideo, prepareImage } from "../services/image";
import { setPendingReview } from "../services/scanStore";
import { toUserMessage } from "../utils/errors";
import { REJECT_MESSAGE, mergeExtraction } from "../utils/validation";

type Phase = "idle" | "camera" | "preview" | "processing";

export function ScanPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const { videoRef, start, stop, attach, error: cameraError } = useCamera();
  const [phase, setPhase] = useState<Phase>("idle");
  const [previewUrl, setPreviewUrl] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("Preparing image");
  const mode = params.get("mode");

  useEffect(() => {
    if (mode === "gallery") fileRef.current?.click();
    if (mode === "camera") void startCamera();
  }, [mode]);

  useEffect(() => {
    if (phase !== "camera") return;
    const frame = requestAnimationFrame(() => attach());
    return () => cancelAnimationFrame(frame);
  }, [phase, attach]);

  async function startCamera() {
    setError("");
    const ok = await start();
    if (!ok) {
      setPhase("idle");
      return;
    }
    setPhase("camera");
  }

  async function onCapture() {
    if (!videoRef.current) return;
    try {
      const photo = await captureFromVideo(videoRef.current);
      stop();
      const prepared = await prepareImage(photo);
      setBlob(prepared.blob);
      setPreviewUrl(prepared.dataUrl);
      setPhase("preview");
    } catch (err) {
      setError(toUserMessage(err, "Could not capture a photo."));
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const prepared = await prepareImage(file);
      setBlob(prepared.blob);
      setPreviewUrl(prepared.dataUrl);
      setPhase("preview");
      stop();
    } catch (err) {
      setError(toUserMessage(err, "Could not read that image."));
    }
  }

  function removeImage() {
    setBlob(null);
    setPreviewUrl("");
    setPhase("idle");
    setError("");
  }

  async function processImage() {
    if (!blob) return;
    setError("");
    setPhase("processing");
    setProgress("Preparing image");
    try {
      const health = await getHealth();
      if (!health.ok) {
        throw new Error("The Bill Snap API is not running. Start the backend and try again.");
      }
      if (!health.aiConfigured) {
        throw new Error(
          "AI is not configured. Add GEMINI_API_KEY to backend/.env. Bill Snap will not invent bill details.",
        );
      }

      const prepared = await prepareImage(blob);
      setProgress("Reading text with OCR");
      const { runOcr } = await import("../services/ocr");
      const ocr = await runOcr(prepared.blob, (status, value) => {
        setProgress(`OCR: ${status} (${Math.round(value * 100)}%)`);
      });

      setProgress("Checking if this is a bill. If Gemini is busy, Bill Snap will retry automatically.");
      const extraction = await analyzeImage({
        imageBase64: prepared.dataUrl,
        mimeType: prepared.mimeType,
        ocrText: ocr.text,
        ocrConfidence: ocr.confidence,
      });

      const merged = mergeExtraction(extraction, ocr);
      if ("rejected" in merged) {
        setError(merged.reason || REJECT_MESSAGE);
        setPhase("preview");
        return;
      }

      setPendingReview({
        ...merged,
        imageBlob: prepared.blob,
        previewUrl: prepared.dataUrl,
        ocrText: ocr.text,
      });
      navigate("/review");
    } catch (err) {
      setError(toUserMessage(err, "Could not process this image."));
      setPhase("preview");
    }
  }

  return (
    <main className="relative min-h-[calc(100dvh-5rem)] px-4 pb-6 pt-5">
      <Logo />
      <h1 className="mt-6 text-2xl font-semibold text-navy">Scan a bill</h1>
      <p className="mt-1 text-sm text-slate-500">Use the camera or upload a clear photo of a receipt or invoice.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={params.get("mode") === "gallery" ? undefined : "environment"}
        className="hidden"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />

      <section className="relative mt-5 overflow-hidden rounded-3xl bg-white shadow-card">
        {phase === "processing" && <LoadingOverlay title="Processing bill" detail={progress} />}

        {phase === "camera" && (
          <div className="space-y-3 p-3">
            <video ref={videoRef} autoPlay playsInline muted className="h-72 w-full rounded-2xl bg-black object-cover" />
            <button
              type="button"
              onClick={() => void onCapture()}
              className="min-h-12 w-full rounded-2xl bg-navy text-sm font-semibold text-white"
            >
              Capture photo
            </button>
          </div>
        )}

        {(phase === "preview" || phase === "processing") && previewUrl && (
          <div className="space-y-3 p-3">
            <img src={previewUrl} alt="Selected bill preview" className="h-72 w-full rounded-2xl object-cover" />
            {phase === "preview" && (
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => void startCamera()} className="min-h-12 rounded-2xl bg-slate-100 text-sm font-medium text-navy">
                  Retake
                </button>
                <button type="button" onClick={removeImage} className="min-h-12 rounded-2xl bg-slate-100 text-sm font-medium text-navy">
                  Remove
                </button>
                <button type="button" onClick={() => void processImage()} className="min-h-12 rounded-2xl bg-navy text-sm font-semibold text-white">
                  Process
                </button>
              </div>
            )}
          </div>
        )}

        {(phase === "idle" || (phase === "processing" && !previewUrl)) && (
          <div className="space-y-3 p-4">
            <button
              type="button"
              onClick={() => void startCamera()}
              className="min-h-12 w-full rounded-2xl bg-navy text-sm font-semibold text-white"
            >
              Open camera
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-12 w-full rounded-2xl bg-slate-100 text-sm font-semibold text-navy"
            >
              Upload from gallery
            </button>
          </div>
        )}
      </section>

      {(error || cameraError) && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error || cameraError}
        </p>
      )}
    </main>
  );
}
