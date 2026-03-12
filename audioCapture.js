// Audio Capture Service using Web Audio API
class AudioCaptureService {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaStreamSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.isInitialized = false;
    this.isRecording = false;
  }

  async initialize(deviceId = null) {
    try {
      // Request microphone access
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          ...(deviceId && { deviceId: { exact: deviceId } })
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 44100
      });

      // Create nodes
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 4096;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Connect nodes
      this.mediaStreamSource.connect(this.gainNode);
      this.gainNode.connect(this.analyser);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio capture:', error);
      throw error;
    }
  }

  start() {
    if (!this.isInitialized) {
      throw new Error('Audio capture not initialized');
    }
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
  }

  async destroy() {
    this.isRecording = false;
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }

    this.audioContext = null;
    this.mediaStream = null;
    this.mediaStreamSource = null;
    this.analyser = null;
    this.gainNode = null;
    this.isInitialized = false;
  }

  setGain(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, value));
    }
  }

  getAnalyser() {
    return this.analyser;
  }

  getAudioContext() {
    return this.audioContext;
  }

  getSampleRate() {
    return this.audioContext?.sampleRate || 44100;
  }

  getTimeData() {
    if (!this.analyser) return new Float32Array(0);
    
    const bufferLength = this.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatTimeDomainData(dataArray);
    return dataArray;
  }

  getFrequencyData() {
    if (!this.analyser) return new Uint8Array(0);
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getFloatFrequencyData() {
    if (!this.analyser) return new Float32Array(0);
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    return dataArray;
  }

  // Get available audio input devices
  static async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  // Check if microphone permission is granted
  static async checkPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch {
      return 'unknown';
    }
  }
}

export const audioCapture = new AudioCaptureService();
export default AudioCaptureService;
