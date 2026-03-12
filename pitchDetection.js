import { YIN } from 'pitchfinder';
import { frequencyToNoteName, frequencyToMidi, midiToFrequency } from '../lib/utils';

// Pitch Detection Service using YIN algorithm (optimized for piano)
class PitchDetectionService {
  constructor() {
    this.detector = null;
    this.sampleRate = 44100;
    this.threshold = 0.05;  // Lower threshold = more sensitive
    this.noiseGate = -70; // dB threshold - much more sensitive
    this.minFrequency = 27.5;  // A0 (lowest piano note)
    this.maxFrequency = 4186;  // C8 (highest piano note)
    this.detectedNotes = [];
    this.currentNotes = new Map();
    this.onNoteOn = null;
    this.onNoteOff = null;
    this.onPitchUpdate = null;
    this.lastDetectionTime = 0;
    this.detectionInterval = 50; // ms
  }

  initialize(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.detector = YIN({
      sampleRate: this.sampleRate,
      threshold: this.threshold,
      probabilityThreshold: 0.1
    });
  }

  setThreshold(value) {
    this.threshold = Math.max(0.01, Math.min(1, value));
    this.detector = YIN({
      sampleRate: this.sampleRate,
      threshold: this.threshold,
      probabilityThreshold: 0.1
    });
  }

  setNoiseGate(value) {
    this.noiseGate = value;
  }

  // Calculate RMS (Root Mean Square) for volume detection
  calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  // Convert RMS to decibels
  rmsToDb(rms) {
    if (rms <= 0) return -100;
    return 20 * Math.log10(rms);
  }

  // Detect pitch from audio buffer
  detect(audioBuffer) {
    if (!this.detector || !audioBuffer || audioBuffer.length === 0) {
      return null;
    }

    const rms = this.calculateRMS(audioBuffer);
    const db = this.rmsToDb(rms);

    // Apply noise gate
    if (db < this.noiseGate) {
      return null;
    }

    // Detect pitch
    const frequency = this.detector(audioBuffer);

    if (frequency === null || frequency < this.minFrequency || frequency > this.maxFrequency) {
      return null;
    }

    // Snap to nearest semitone for cleaner detection
    const midi = frequencyToMidi(frequency);
    const snappedFrequency = midiToFrequency(midi);
    const noteName = frequencyToNoteName(snappedFrequency);

    return {
      frequency: snappedFrequency,
      originalFrequency: frequency,
      noteName,
      midi,
      volume: db,
      rms,
      timestamp: Date.now()
    };
  }

  // Polyphonic detection using FFT peak analysis
  detectPolyphonic(frequencyData, sampleRate = 44100) {
    const peaks = this.findSpectralPeaks(frequencyData, sampleRate);
    const notes = [];

    for (const peak of peaks) {
      if (peak.frequency >= this.minFrequency && peak.frequency <= this.maxFrequency) {
        const midi = frequencyToMidi(peak.frequency);
        const snappedFrequency = midiToFrequency(midi);
        const noteName = frequencyToNoteName(snappedFrequency);

        notes.push({
          frequency: snappedFrequency,
          noteName,
          midi,
          magnitude: peak.magnitude,
          timestamp: Date.now()
        });
      }
    }

    // Sort by magnitude (loudest first)
    notes.sort((a, b) => b.magnitude - a.magnitude);

    // Limit to top 6 notes (typical piano chord)
    return notes.slice(0, 6);
  }

  // Find peaks in FFT spectrum
  findSpectralPeaks(frequencyData, sampleRate) {
    const peaks = [];
    const binSize = sampleRate / (frequencyData.length * 2);
    const minBin = Math.floor(this.minFrequency / binSize);
    const maxBin = Math.min(frequencyData.length - 1, Math.floor(this.maxFrequency / binSize));
    const threshold = -60; // dB threshold for peak detection

    for (let i = minBin + 1; i < maxBin; i++) {
      const current = frequencyData[i];
      const prev = frequencyData[i - 1];
      const next = frequencyData[i + 1];

      // Check if this is a local maximum above threshold
      if (current > prev && current > next && current > threshold) {
        // Parabolic interpolation for more accurate frequency
        const alpha = prev;
        const beta = current;
        const gamma = next;
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        
        const refinedBin = i + p;
        const frequency = refinedBin * binSize;
        
        peaks.push({
          frequency,
          magnitude: current,
          bin: i
        });
      }
    }

    return peaks;
  }

  // Process detected note (for tracking note on/off)
  processNote(detection, startTime) {
    if (!detection) {
      // Check for note offs
      const now = Date.now();
      for (const [midi, noteData] of this.currentNotes) {
        if (now - noteData.lastSeen > 100) { // 100ms timeout
          const duration = (now - noteData.startTime) / 1000;
          if (this.onNoteOff) {
            this.onNoteOff({
              ...noteData,
              duration,
              endTime: now
            });
          }
          this.detectedNotes.push({
            ...noteData,
            duration,
            endTime: now
          });
          this.currentNotes.delete(midi);
        }
      }
      return;
    }

    const { midi, noteName, frequency, volume, timestamp } = detection;
    
    if (this.currentNotes.has(midi)) {
      // Update existing note
      const noteData = this.currentNotes.get(midi);
      noteData.lastSeen = timestamp;
      noteData.maxVolume = Math.max(noteData.maxVolume, volume);
    } else {
      // New note
      const noteData = {
        midi,
        noteName,
        frequency,
        startTime: timestamp,
        relativeStartTime: (timestamp - startTime) / 1000,
        lastSeen: timestamp,
        maxVolume: volume,
        velocity: Math.min(127, Math.max(1, Math.round((volume + 60) * 2)))
      };
      
      this.currentNotes.set(midi, noteData);
      
      if (this.onNoteOn) {
        this.onNoteOn(noteData);
      }
    }

    if (this.onPitchUpdate) {
      this.onPitchUpdate(detection);
    }
  }

  // Get all detected notes
  getDetectedNotes() {
    return [...this.detectedNotes];
  }

  // Clear detected notes
  clearNotes() {
    this.detectedNotes = [];
    this.currentNotes.clear();
  }

  // End all current notes
  endAllNotes() {
    const now = Date.now();
    for (const [midi, noteData] of this.currentNotes) {
      const duration = (now - noteData.startTime) / 1000;
      if (this.onNoteOff) {
        this.onNoteOff({
          ...noteData,
          duration,
          endTime: now
        });
      }
      this.detectedNotes.push({
        ...noteData,
        duration,
        endTime: now
      });
    }
    this.currentNotes.clear();
  }
}

export const pitchDetection = new PitchDetectionService();
export default PitchDetectionService;
