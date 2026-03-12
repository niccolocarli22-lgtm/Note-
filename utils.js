import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Music constants
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const A4_FREQUENCY = 440;
export const A4_MIDI = 69;

// Convert frequency to MIDI note number
export function frequencyToMidi(frequency) {
  if (frequency <= 0) return null;
  return Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
}

// Convert MIDI note number to frequency
export function midiToFrequency(midi) {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Convert MIDI note number to note name
export function midiToNoteName(midi) {
  if (midi === null || midi === undefined) return '';
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Convert frequency to note name
export function frequencyToNoteName(frequency) {
  const midi = frequencyToMidi(frequency);
  return midi ? midiToNoteName(midi) : '';
}

// Convert note name to MIDI
export function noteNameToMidi(noteName) {
  const match = noteName.match(/^([A-G]#?)(\d+)$/);
  if (!match) return null;
  
  const [, note, octave] = match;
  const noteIndex = NOTE_NAMES.indexOf(note);
  if (noteIndex === -1) return null;
  
  return noteIndex + (parseInt(octave) + 1) * 12;
}

// Format duration in seconds to mm:ss
export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format timestamp
export function formatTimestamp(date) {
  return new Date(date).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
