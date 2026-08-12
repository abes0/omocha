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

// 前回「サイン波+倍音・長め(0.3s)」が一番近いとのことだったので、
// その音色(3000Hz + 6000Hzの弱い倍音)を軸に、エンベロープの違い
// (だんだん強くなるか、終始一定の音量か)を比較する。
const BASE_FREQ = 3000;
const HARMONIC_FREQ = BASE_FREQ * 2;

function harmonicTone(
  duration: number,
  envelope: "decay" | "sustain" | "rise",
): ToneSegment[] {
  return [
    {
      type: "sine",
      frequency: BASE_FREQ,
      duration,
      envelope,
      harmonics: [{ frequency: HARMONIC_FREQ, gain: 0.35 }],
    },
  ];
}

const SOUND_GROUPS: SoundGroup[] = [
  {
    title: "だんだん強くなる型（最初が弱く、最後が一番強い）",
    options: [
      {
        id: "rise-010",
        label: "0.10s",
        description: "弱く始まり、鳴り終わりが最も強い",
        segments: harmonicTone(0.1, "rise"),
      },
      {
        id: "rise-015",
        label: "0.15s",
        description: "弱く始まり、鳴り終わりが最も強い",
        segments: harmonicTone(0.15, "rise"),
      },
      {
        id: "rise-020",
        label: "0.20s",
        description: "弱く始まり、鳴り終わりが最も強い",
        segments: harmonicTone(0.2, "rise"),
      },
    ],
  },
  {
    title: "サステイン型（一定音量を保って最後にスッと切れる）",
    options: [
      {
        id: "sustain-010",
        label: "0.10s",
        description: "ほぼ一定の音量で鳴り、最後だけ短く消える",
        segments: harmonicTone(0.1, "sustain"),
      },
      {
        id: "sustain-015",
        label: "0.15s",
        description: "ほぼ一定の音量で鳴り、最後だけ短く消える",
        segments: harmonicTone(0.15, "sustain"),
      },
      {
        id: "sustain-020",
        label: "0.20s",
        description: "ほぼ一定の音量で鳴り、最後だけ短く消える",
        segments: harmonicTone(0.2, "sustain"),
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
          サイン波(3000Hz)+倍音(6000Hz)をベースに、長さとエンベロープの違いを比較
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
