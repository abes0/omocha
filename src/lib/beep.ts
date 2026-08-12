export type Harmonic = {
  frequency: number;
  gain?: number;
};

export type ToneSegment = {
  type: OscillatorType;
  frequency: number;
  frequencyEnd?: number;
  duration: number;
  gain?: number;
  gapAfter?: number;
  /** Extra simultaneous overtones layered on top of the main tone. */
  harmonics?: Harmonic[];
};

function scheduleTone(
  ctx: AudioContext,
  time: number,
  options: {
    type: OscillatorType;
    frequency: number;
    frequencyEnd?: number;
    duration: number;
    peak: number;
  },
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = options.type;
  osc.frequency.setValueAtTime(options.frequency, time);
  if (options.frequencyEnd) {
    osc.frequency.linearRampToValueAtTime(
      options.frequencyEnd,
      time + options.duration,
    );
  }

  gainNode.gain.setValueAtTime(0.0001, time);
  gainNode.gain.exponentialRampToValueAtTime(options.peak, time + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    time + options.duration,
  );

  osc.connect(gainNode).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + options.duration + 0.02);
}

export function playTonePattern(ctx: AudioContext, segments: ToneSegment[]) {
  if (ctx.state === "suspended") ctx.resume();

  let time = ctx.currentTime;
  for (const segment of segments) {
    const peak = segment.gain ?? 0.3;
    scheduleTone(ctx, time, {
      type: segment.type,
      frequency: segment.frequency,
      frequencyEnd: segment.frequencyEnd,
      duration: segment.duration,
      peak,
    });

    for (const harmonic of segment.harmonics ?? []) {
      scheduleTone(ctx, time, {
        type: segment.type,
        frequency: harmonic.frequency,
        duration: segment.duration,
        peak: peak * (harmonic.gain ?? 0.3),
      });
    }

    time += segment.duration + (segment.gapAfter ?? 0);
  }
}
