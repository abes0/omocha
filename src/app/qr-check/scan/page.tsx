"use client";

import Link from "next/link";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { normalizeUrl } from "@/lib/url";

type Status =
  | "idle"
  | "requesting"
  | "scanning"
  | "mismatch"
  | "matched"
  | "denied"
  | "unsupported"
  | "insecure";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const matchedRef = useRef(false);
  const lastCodeRef = useRef<string | null>(null);
  const tickRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [detected, setDetected] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("");

  const playBeep = useCallback((ok: boolean) => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + (ok ? 0.18 : 0.28),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.2 : 0.3));
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || matchedRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          if (code.data !== lastCodeRef.current) {
            lastCodeRef.current = code.data;
            setDetected(code.data);
            const isMatch =
              normalizeUrl(code.data) === normalizeUrl(window.location.href);

            if (isMatch) {
              matchedRef.current = true;
              setStatus("matched");
              playBeep(true);
              navigator.vibrate?.(80);
              stopCamera();
              return;
            }
            setStatus("mismatch");
            playBeep(false);
            navigator.vibrate?.([40, 40, 40]);
          }
        } else {
          lastCodeRef.current = null;
          if (!matchedRef.current) setStatus("scanning");
        }
      }
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [playBeep, stopCamera]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(async () => {
    // getUserMedia is only exposed in secure contexts (HTTPS, or localhost on
    // the device itself). Accessing the dev server from a phone via a plain
    // http://<LAN-IP> URL is not secure, so surface that clearly instead of
    // silently failing.
    if (!window.isSecureContext) {
      setStatus("insecure");
      return;
    }

    setStatus("requesting");

    // Tapping the start button is the user gesture that unlocks audio
    // playback. Kick off resume() without awaiting it: on some browsers the
    // returned promise never resolves until a gesture happens, and awaiting
    // it here would block the camera from starting at all.
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      audioCtxRef.current ??= new AudioCtx();
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      canvasRef.current ??= document.createElement("canvas");
      matchedRef.current = false;
      lastCodeRef.current = null;
      setDetected(null);
      setCurrentUrl(window.location.href);
      setStatus("scanning");
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (err) {
      console.error(err);
      setStatus("denied");
    }
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      <header className="relative z-10 flex items-center gap-3 p-4">
        <Link
          href="/qr-check"
          className="rounded-full bg-black/40 p-2 backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-semibold drop-shadow">QRスキャン</h1>
      </header>

      {(status === "scanning" || status === "mismatch") && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-8">
            <div
              className={`h-64 w-64 rounded-3xl border-4 transition-colors ${
                status === "mismatch" ? "border-rose-400" : "border-emerald-300"
              }`}
            />
            <p className="rounded-full bg-black/50 px-4 py-2 text-center text-sm backdrop-blur">
              {status === "mismatch"
                ? "ちがうQRコードです"
                : "URLのQRコードを枠内に映してください"}
            </p>
          </div>
          {currentUrl && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-6">
              <p className="truncate rounded-full bg-black/50 px-4 py-2 text-center text-xs text-slate-300 backdrop-blur">
                比較対象: {currentUrl}
              </p>
            </div>
          )}
        </>
      )}

      {status === "idle" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <Camera className="h-12 w-12 text-slate-200" />
          <p className="text-sm text-slate-300">
            ボタンを押してカメラを起動し、QRコードを読み取ります。
          </p>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950"
          >
            <Camera className="h-4 w-4" />
            スキャンを開始する
          </button>
        </div>
      )}

      {status === "requesting" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
          <p className="text-sm text-slate-300">カメラを起動しています…</p>
        </div>
      )}

      {status === "insecure" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <XCircle className="h-12 w-12 text-rose-400" />
          <p className="text-sm text-slate-200">
            カメラAPIはHTTPS(またはPC自体でのlocalhost)でのみ利用できます。
            <br />
            スマホからPCのIPアドレスへ「http://」で直接アクセスしている場合、この制限に該当します。
            <br />
            HTTPS化されたURL（例: Cloudflare Workersへのデプロイやトンネルツール経由）でお試しください。
          </p>
        </div>
      )}

      {status === "denied" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <XCircle className="h-12 w-12 text-rose-400" />
          <p className="text-sm text-slate-200">
            カメラへのアクセスが許可されていません。ブラウザの設定を確認してから、もう一度試してください。
          </p>
          <button
            onClick={startCamera}
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950"
          >
            もう一度試す
          </button>
        </div>
      )}

      {status === "unsupported" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <XCircle className="h-12 w-12 text-rose-400" />
          <p className="text-sm text-slate-200">
            お使いのブラウザはカメラ機能に対応していません。
          </p>
        </div>
      )}

      {status === "matched" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-emerald-500 px-8 text-center text-slate-950">
          <CheckCircle2 className="h-20 w-20" />
          <div>
            <p className="text-2xl font-bold">ピッ！ 一致しました</p>
            {detected && (
              <p className="mt-1 max-w-xs break-all text-sm text-slate-900/70">
                {detected}
              </p>
            )}
          </div>
          <button
            onClick={startCamera}
            className="mt-2 flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white"
          >
            <RotateCcw className="h-4 w-4" />
            もう一度スキャンする
          </button>
        </div>
      )}
    </div>
  );
}
