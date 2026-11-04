import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const attach = useCallback(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError("");
    stop();
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      attach();
      return true;
    } catch {
      setError("Camera permission was denied. You can still upload a bill from your gallery.");
      return false;
    }
  }, [attach, stop]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, start, stop, attach, error, setError };
}
