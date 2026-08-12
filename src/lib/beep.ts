export type Harmonic = {
  frequency: number;
  gain?: number;
};

export type Envelope = "decay" | "sustain" | "rise";

export type ToneSegment = {
  type: OscillatorType;
  frequency: number;
  frequencyEnd?: number;
  duration: number;
  gain?: number;
  gapAfter?: number;
  /** Extra simultaneous overtones layered on top of the main tone. */
  harmonics?: Harmonic[];
  /**
   * "decay" (default): quick attack, then decays continuously for the
   * whole duration (loudest right at the start).
   * "sustain": quick attack, holds at peak volume, then a short release
   * right at the end (constant volume until it cuts off).
   * "rise": starts quiet and builds continuously, loudest right at the end.
   */
  envelope?: Envelope;
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
    envelope: Envelope;
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

  const attack = 0.004;
  gainNode.gain.setValueAtTime(0.0001, time);

  if (options.envelope === "rise") {
    // Builds continuously across the whole duration, then a very short
    // (near-inaudible) release right at the end so the oscillator doesn't
    // click when it stops at a high amplitude.
    const microRelease = Math.min(0.008, options.duration * 0.1);
    gainNode.gain.exponentialRampToValueAtTime(
      options.peak,
      time + options.duration - microRelease,
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      time + options.duration,
    );
  } else if (options.envelope === "sustain") {
    const release = Math.min(0.03, options.duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(options.peak, time + attack);
    gainNode.gain.setValueAtTime(options.peak, time + options.duration - release);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      time + options.duration,
    );
  } else {
    gainNode.gain.exponentialRampToValueAtTime(options.peak, time + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      time + options.duration,
    );
  }

  osc.connect(gainNode).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + options.duration + 0.02);
}

export function playTonePattern(ctx: AudioContext, segments: ToneSegment[]) {
  if (ctx.state === "suspended") ctx.resume();

  let time = ctx.currentTime;
  for (const segment of segments) {
    const peak = segment.gain ?? 0.3;
    const envelope = segment.envelope ?? "decay";
    scheduleTone(ctx, time, {
      type: segment.type,
      frequency: segment.frequency,
      frequencyEnd: segment.frequencyEnd,
      duration: segment.duration,
      peak,
      envelope,
    });

    for (const harmonic of segment.harmonics ?? []) {
      scheduleTone(ctx, time, {
        type: segment.type,
        frequency: harmonic.frequency,
        duration: segment.duration,
        peak: peak * (harmonic.gain ?? 0.3),
        envelope,
      });
    }

    time += segment.duration + (segment.gapAfter ?? 0);
  }
}
