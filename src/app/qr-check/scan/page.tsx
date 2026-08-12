"use client";

import Link from "next/link";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, XCircle } from "lucide-react";
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

const BEEP_COOLDOWN_MS = 3000;

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
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
    osc.frequency.value = ok ? 1760 : 220;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + (ok ? 0.35 : 0.28),
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.4 : 0.3));
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
    if (!video || !canvas) return;

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
          if (Date.now() >= cooldownUntilRef.current) {
            cooldownUntilRef.current = Date.now() + BEEP_COOLDOWN_MS;
            const isMatch =
              normalizeUrl(code.data) === normalizeUrl(window.location.href);

            if (isMatch) {
              setStatus("matched");
              playBeep(true);
              navigator.vibrate?.(80);
            } else {
              setStatus("mismatch");
              playBeep(false);
              navigator.vibrate?.([40, 40, 40]);
            }
          }
        } else {
          setStatus("scanning");
        }
      }
    }
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [playBeep]);

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
      cooldownUntilRef.current = 0;
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
    <div className="relative min-h-dvh w-full overflow-hidden bg-slate-50 text-slate-900">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/60" />

      <header className="relative z-10 flex items-center gap-3 p-4">
        <Link
          href="/qr-check"
          className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm backdrop-blur"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm backdrop-blur">
          QRスキャン
        </h1>
      </header>

      {(status === "scanning" ||
        status === "mismatch" ||
        status === "matched") && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 px-8">
            <div
              className={`h-64 w-64 rounded-3xl border-4 transition-colors ${
                status === "mismatch"
                  ? "border-rose-500"
                  : status === "matched"
                    ? "border-emerald-500"
                    : "border-white/80"
              }`}
            />
            <p className="rounded-full bg-white/90 px-4 py-2 text-center text-sm font-medium text-slate-900 shadow-sm backdrop-blur">
              {status === "mismatch"
                ? "ちがうQRコードです"
                : status === "matched"
                  ? "ピッ！ 一致しました"
                  : "URLのQRコードを枠内に映してください"}
            </p>
          </div>
          {currentUrl && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 px-6">
              <p className="truncate rounded-full bg-white/90 px-4 py-2 text-center text-xs text-slate-600 shadow-sm backdrop-blur">
                比較対象: {currentUrl}
              </p>
            </div>
          )}
        </>
      )}

      {status === "idle" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <Camera className="h-12 w-12 text-slate-400" />
          <p className="text-sm text-slate-600">
            ボタンを押してカメラを起動し、QRコードを読み取ります。
          </p>
          <button
            onClick={startCamera}
            className="flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20"
          >
            <Camera className="h-4 w-4" />
            スキャンを開始する
          </button>
        </div>
      )}

      {status === "requesting" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-600">カメラを起動しています…</p>
        </div>
      )}

      {status === "insecure" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <XCircle className="h-12 w-12 text-rose-500" />
          <p className="text-sm text-slate-700">
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
          <XCircle className="h-12 w-12 text-rose-500" />
          <p className="text-sm text-slate-700">
            カメラへのアクセスが許可されていません。ブラウザの設定を確認してから、もう一度試してください。
          </p>
          <button
            onClick={startCamera}
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20"
          >
            もう一度試す
          </button>
        </div>
      )}

      {status === "unsupported" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <XCircle className="h-12 w-12 text-rose-500" />
          <p className="text-sm text-slate-700">
            お使いのブラウザはカメラ機能に対応していません。
          </p>
        </div>
      )}
    </div>
  );
}
