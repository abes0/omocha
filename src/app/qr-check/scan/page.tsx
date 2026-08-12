"use client";

import Link from "next/link";
import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Loader2, XCircle } from "lucide-react";
import { normalizeUrl } from "@/lib/url";
import { playTonePattern, type ToneSegment } from "@/lib/beep";

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

// サステイン型・0.15s・3000Hz(+6000Hzの弱い倍音)で聞き比べた結果、決定した音。
const MATCH_TONE: ToneSegment[] = [
  {
    type: "sine",
    frequency: 3000,
    duration: 0.15,
    envelope: "sustain",
    harmonics: [{ frequency: 6000, gain: 0.35 }],
  },
];
const MISMATCH_TONE: ToneSegment[] = [
  { type: "sine", frequency: 220, duration: 0.3 },
];

// この2つを同時に再生して重ねる。
const REGISTER_SOUND_SRC = "/sounds/register_sound.mp3";
const PAYPAY_SOUND_SRC = "/sounds/paypay_sound.m4a";
// paypay音声はファイル内の0.9秒地点(実際の音声が始まる位置)から再生する。
const PAYPAY_START_OFFSET_SEC = 0.95;
const PAYPAY_VOLUME = 1;
// レジ音は最初小さく→だんだん大きくするが、最大でも0.2までに抑える。
// (HTMLAudioElement.volumeはiOS Safariでは無視されるため、GainNode経由で制御する)
const REGISTER_MIN_VOLUME = 0.00;
const REGISTER_MAX_VOLUME = 0.01;

function rampRegisterGain(ctx: AudioContext, gainNode: GainNode, duration: number) {
  const now = ctx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(REGISTER_MIN_VOLUME, now);
  gainNode.gain.linearRampToValueAtTime(
    REGISTER_MAX_VOLUME,
    now + Math.max(duration, 0.05),
  );
}

type SoundMode = "beep" | "payment";
type CameraFacing = "user" | "environment";

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const registerAudioRef = useRef<HTMLAudioElement | null>(null);
  const registerGainRef = useRef<GainNode | null>(null);
  const registerSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const paypayAudioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const tickRef = useRef<() => void>(() => {});

  const [status, setStatus] = useState<Status>("idle");
  const [currentUrl, setCurrentUrl] = useState("");
  const [soundMode, setSoundMode] = useState<SoundMode>("beep");
  const [facingMode, setFacingMode] = useState<CameraFacing>("user");

  const playBeep = useCallback((ok: boolean) => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    audioCtxRef.current ??= new AudioCtx();
    playTonePattern(audioCtxRef.current, ok ? MATCH_TONE : MISMATCH_TONE);
  }, []);

  const playMatchSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    const registerAudio = registerAudioRef.current;
    const registerGain = registerGainRef.current;
    const paypayAudio = paypayAudioRef.current;
    if (soundMode === "payment" && ctx && registerAudio && registerGain && paypayAudio) {
      registerAudio.currentTime = 0;
      rampRegisterGain(ctx, registerGain, registerAudio.duration || 0.3);
      registerAudio.play().catch(() => {});

      paypayAudio.currentTime = PAYPAY_START_OFFSET_SEC;
      paypayAudio.volume = PAYPAY_VOLUME;
      paypayAudio.play().catch(() => {});
      return;
    }
    playBeep(true);
  }, [soundMode, playBeep]);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    // Otherwise, leaving this screen mid-playback (e.g. right after a match)
    // lets the old audio elements keep playing in the background, since
    // nothing else ever stops them. That leftover sound can then surface
    // later, e.g. right as "スキャンを開始する" is pressed on a fresh visit.
    const registerAudio = registerAudioRef.current;
    if (registerAudio) {
      registerAudio.pause();
      registerAudio.currentTime = 0;
    }
    const paypayAudio = paypayAudioRef.current;
    if (paypayAudio) {
      paypayAudio.pause();
      paypayAudio.currentTime = 0;
    }
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
              playMatchSound();
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
  }, [playBeep, playMatchSound]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(async (mode: CameraFacing = facingMode) => {
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

    // Same idea for the payment sound files: play+pause each once (muted, so
    // it's inaudible) while we still have the gesture, so later programmatic
    // play() calls from inside the scan loop are allowed to make sound.
    registerAudioRef.current ??= new Audio(REGISTER_SOUND_SRC);
    paypayAudioRef.current ??= new Audio(PAYPAY_SOUND_SRC);
    const registerAudio = registerAudioRef.current;
    const paypayAudio = paypayAudioRef.current;

    // Route the register sound through a GainNode instead of relying on
    // HTMLAudioElement.volume, which iOS Safari silently ignores.
    // createMediaElementSource() may only be called once per element ever,
    // so this wiring happens exactly once (guarded by registerGainRef).
    if (audioCtxRef.current && !registerGainRef.current) {
      const ctx = audioCtxRef.current;
      const source = ctx.createMediaElementSource(registerAudio);
      const gainNode = ctx.createGain();
      gainNode.gain.value = REGISTER_MIN_VOLUME;
      source.connect(gainNode).connect(ctx.destination);
      registerSourceRef.current = source;
      registerGainRef.current = gainNode;
    }
    for (const audio of [registerAudio, paypayAudio]) {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
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
  }, [facingMode]);

  const handleFacingModeChange = useCallback(
    (mode: CameraFacing) => {
      setFacingMode(mode);
      // If the camera is already running, restart it with the new facing
      // mode right away instead of waiting for the next visit to this page.
      if (streamRef.current) {
        stopCamera();
        startCamera(mode);
      }
    },
    [stopCamera, startCamera],
  );

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

      <div className="relative z-10 flex flex-col items-center gap-2 px-4">
        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => handleFacingModeChange("user")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              facingMode === "user"
                ? "bg-emerald-500 text-white"
                : "text-slate-600"
            }`}
          >
            インカメ
          </button>
          <button
            onClick={() => handleFacingModeChange("environment")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              facingMode === "environment"
                ? "bg-emerald-500 text-white"
                : "text-slate-600"
            }`}
          >
            アウトカメラ
          </button>
        </div>

        <div className="flex gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => setSoundMode("beep")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              soundMode === "beep"
                ? "bg-emerald-500 text-white"
                : "text-slate-600"
            }`}
          >
            ピー音
          </button>
          <button
            onClick={() => setSoundMode("payment")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              soundMode === "payment"
                ? "bg-emerald-500 text-white"
                : "text-slate-600"
            }`}
          >
            決済音
          </button>
        </div>
      </div>

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
            onClick={() => startCamera()}
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
            onClick={() => startCamera()}
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
