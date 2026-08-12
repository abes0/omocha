export type ToneSegment = {
  type: OscillatorType;
  frequency: number;
  frequencyEnd?: number;
  duration: number;
  gain?: number;
  gapAfter?: number;
};

export function playTonePattern(ctx: AudioContext, segments: ToneSegment[]) {
  if (ctx.state === "suspended") ctx.resume();

  let time = ctx.currentTime;
  for (const segment of segments) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = segment.type;
    osc.frequency.setValueAtTime(segment.frequency, time);
    if (segment.frequencyEnd) {
      osc.frequency.linearRampToValueAtTime(
        segment.frequencyEnd,
        time + segment.duration,
      );
    }

    const peak = segment.gain ?? 0.3;
    gainNode.gain.setValueAtTime(0.0001, time);
    gainNode.gain.exponentialRampToValueAtTime(peak, time + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      time + segment.duration,
    );

    osc.connect(gainNode).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + segment.duration + 0.02);

    time += segment.duration + (segment.gapAfter ?? 0);
  }
}
