"use client";

import { useRef } from "react";
import { Volume2 } from "lucide-react";
import { playTonePattern, type ToneSegment } from "@/lib/beep";

type SoundOption = {
  id: string;
  label: string;
  description: string;
  segments: ToneSegment[];
};

type SoundGroup = {
  title: string;
  options: SoundOption[];
};

// 実測でバーコードスキャナー音の基音が約3,000Hz(F#7付近)、
// 2倍音(6,000Hz)も強く出ているとの解析結果をもとに構成。
const BASE_FREQ = 3000;
const HARMONIC_FREQ = BASE_FREQ * 2;

const SOUND_GROUPS: SoundGroup[] = [
  {
    title: "単発「ピッ」",
    options: [
      {
        id: "pi-sine-short",
        label: "サイン波・短め (0.05s)",
        description: "3000Hzの純粋なサイン波",
        segments: [{ type: "sine", frequency: BASE_FREQ, duration: 0.05 }],
      },
      {
        id: "pi-square-short",
        label: "矩形波・短め (0.05s)",
        description: "3000Hzの矩形波。倍音を多く含みやや硬い音",
        segments: [{ type: "square", frequency: BASE_FREQ, duration: 0.05 }],
      },
      {
        id: "pi-harmonic-short",
        label: "サイン波+倍音・短め (0.05s)",
        description: "3000Hz + 6000Hz(弱め)を重ねた音",
        segments: [
          {
            type: "sine",
            frequency: BASE_FREQ,
            duration: 0.05,
            harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
          },
        ],
      },
      {
        id: "pi-sine-mid",
        label: "サイン波・標準 (0.08s)",
        description: "3000Hzのサイン波、やや長め",
        segments: [{ type: "sine", frequency: BASE_FREQ, duration: 0.08 }],
      },
      {
        id: "pi-harmonic-mid",
        label: "サイン波+倍音・標準 (0.08s)",
        description: "3000Hz + 6000Hz(弱め)、やや長め",
        segments: [
          {
            type: "sine",
            frequency: BASE_FREQ,
            duration: 0.08,
            harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
          },
        ],
      },
    ],
  },
  {
    title: "連続「ピピ」",
    options: [
      {
        id: "pipi-sine",
        label: "サイン波・ダブル",
        description: "3000Hzのサイン波を2回",
        segments: [
          { type: "sine", frequency: BASE_FREQ, duration: 0.05, gapAfter: 0.05 },
          { type: "sine", frequency: BASE_FREQ, duration: 0.05 },
        ],
      },
      {
        id: "pipi-square",
        label: "矩形波・ダブル",
        description: "3000Hzの矩形波を2回",
        segments: [
          { type: "square", frequency: BASE_FREQ, duration: 0.05, gapAfter: 0.05 },
          { type: "square", frequency: BASE_FREQ, duration: 0.05 },
        ],
      },
      {
        id: "pipi-harmonic",
        label: "サイン波+倍音・ダブル",
        description: "3000Hz + 6000Hz(弱め)を2回",
        segments: [
          {
            type: "sine",
            frequency: BASE_FREQ,
            duration: 0.05,
            gapAfter: 0.05,
            harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
          },
          {
            type: "sine",
            frequency: BASE_FREQ,
            duration: 0.05,
            harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
          },
        ],
      },
      {
        id: "pipi-tight",
        label: "サイン波・詰め気味",
        description: "間隔を短くした「ピピッ」",
        segments: [
          { type: "sine", frequency: BASE_FREQ, duration: 0.04, gapAfter: 0.03 },
          { type: "sine", frequency: BASE_FREQ, duration: 0.04 },
        ],
      },
    ],
  },
  {
    title: "長め「ピー」",
    options: [
      {
        id: "pii-sine",
        label: "サイン波・長め (0.3s)",
        description: "3000Hzのサイン波を長く伸ばす",
        segments: [{ type: "sine", frequency: BASE_FREQ, duration: 0.3 }],
      },
      {
        id: "pii-square",
        label: "矩形波・長め (0.3s)",
        description: "3000Hzの矩形波を長く伸ばす",
        segments: [{ type: "square", frequency: BASE_FREQ, duration: 0.3 }],
      },
      {
        id: "pii-harmonic",
        label: "サイン波+倍音・長め (0.3s)",
        description: "3000Hz + 6000Hz(弱め)を長く伸ばす",
        segments: [
          {
            type: "sine",
            frequency: BASE_FREQ,
            duration: 0.3,
            harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
          },
        ],
      },
    ],
  },
];

export default function SoundTestPage() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const play = (segments: ToneSegment[]) => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    audioCtxRef.current ??= new AudioCtx();
    playTonePattern(audioCtxRef.current, segments);
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-6 py-12">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">音の聞き比べ</h1>
        <p className="mt-1 text-sm text-slate-500">
          基音3000Hz(実測値)をベースにした候補です
        </p>
      </div>

      {SOUND_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-600">
            {group.title}
          </h2>
          <div className="flex flex-col gap-3">
            {group.options.map((option) => (
              <button
                key={option.id}
                onClick={() => play(option.segments)}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Volume2 className="h-5 w-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold text-slate-900">
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
