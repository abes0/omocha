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

const SOUND_OPTIONS: SoundOption[] = [
  {
    id: "classic-square",
    label: "① 定番スクエア",
    description: "矩形波でシンプルな「ピッ」",
    segments: [{ type: "square", frequency: 2000, duration: 0.09 }],
  },
  {
    id: "compact-high",
    label: "② 小型レジ風（高め）",
    description: "小型スーパーのレジのような高くて短い音",
    segments: [{ type: "square", frequency: 2600, duration: 0.06 }],
  },
  {
    id: "double-beep",
    label: "③ ダブルピッ",
    description: "「ピピッ」と2回連続で鳴る",
    segments: [
      { type: "square", frequency: 1800, duration: 0.05, gapAfter: 0.05 },
      { type: "square", frequency: 1800, duration: 0.05 },
    ],
  },
  {
    id: "solid-low",
    label: "④ しっかり低め",
    description: "少し低めで存在感のある「ピー」",
    segments: [{ type: "square", frequency: 1500, duration: 0.15 }],
  },
  {
    id: "rising-chirp",
    label: "⑤ 上昇チャープ",
    description: "「ピロッ」と音程が上がる",
    segments: [
      { type: "triangle", frequency: 1200, frequencyEnd: 2200, duration: 0.12 },
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 py-12">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900">音の聞き比べ</h1>
        <p className="mt-1 text-sm text-slate-500">
          ボタンを押すとそれぞれの「ピッ」音を再生します
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SOUND_OPTIONS.map((option) => (
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
  );
}
