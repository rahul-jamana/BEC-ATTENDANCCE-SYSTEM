/**
 * Web Audio API Notification Sound Synthesizer & Mobile Autoplay Unlocker
 * Resolves iOS Safari & Android Chrome Autoplay restrictions by warming up and resuming
 * AudioContext on the first student touch/click anywhere on the device screen.
 */

let sharedAudioCtx = null;

// Function to get or initialize shared AudioContext
const getAudioContext = () => {
  if (!sharedAudioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      sharedAudioCtx = new AudioContextClass();
    }
  }
  return sharedAudioCtx;
};

// Warm up / unlock AudioContext on user interaction
export const unlockAudio = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // Play silent 1-sample buffer to permanently bypass iOS Safari restriction
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    // Ignore suppressed unlock attempts
  }
};

// Global event listeners to unlock AudioContext on FIRST user gesture
if (typeof window !== "undefined") {
  const unlockEvents = ["touchstart", "touchend", "pointerdown", "click", "keydown"];

  const handleFirstInteraction = () => {
    unlockAudio();
    unlockEvents.forEach((evt) => {
      window.removeEventListener(evt, handleFirstInteraction, true);
    });
  };

  unlockEvents.forEach((evt) => {
    window.addEventListener(evt, handleFirstInteraction, { capture: true, once: true });
  });
}

// Play pleasant double-chime notification sound
export const playAttendanceAlertChime = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    // First tone (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Second tone (A5 - 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (err) {
    console.warn("Audio chime suppressed:", err);
  }
};

