/**
 * Basic audio system using Web Audio API.
 * Must be initialized after user gesture.
 * Sounds for move, combat, etc.
 */

let audioContext: AudioContext | null = null;

export function initAudio() {
	if (!audioContext) {
		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
	}
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
	if (!audioContext) return;

	const oscillator = audioContext.createOscillator();
	const gain = audioContext.createGain();
	const filter = audioContext.createBiquadFilter();

	oscillator.type = type;
	oscillator.frequency.value = frequency;

	filter.type = 'lowpass';
	filter.frequency.value = 1200;

	gain.gain.value = volume;
	gain.gain.linearRampToValueAtTime(0.001, audioContext.currentTime + duration);

	oscillator.connect(filter);
	filter.connect(gain);
	gain.connect(audioContext.destination);

	oscillator.start();
	oscillator.stop(audioContext.currentTime + duration);
}

export function playMoveSound() {
	playTone(440, 0.15, 'square', 0.2);
}

export function playCombatSound(win: boolean) {
	if (win) {
		playTone(660, 0.2, 'sawtooth', 0.25);
		setTimeout(() => playTone(880, 0.3, 'sawtooth', 0.2), 150);
	} else {
		playTone(220, 0.4, 'sawtooth', 0.3);
	}
}

export function playSelectSound() {
	playTone(550, 0.08, 'sine', 0.15);
}

export function playInvalidSound() {
	playTone(150, 0.2, 'sawtooth', 0.2);
}

export function playVictorySound() {
	playTone(523, 0.2);
	setTimeout(() => playTone(659, 0.2), 200);
	setTimeout(() => playTone(784, 0.4), 400);
}
