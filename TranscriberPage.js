import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Header } from '../components/Header';
import { ControlBar } from '../components/ControlBar';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { SheetMusicCanvas } from '../components/SheetMusicCanvas';
import { PitchDisplay } from '../components/PitchDisplay';
import { SettingsDialog } from '../components/SettingsDialog';
import { audioCapture } from '../services/audioCapture';
import { pitchDetection } from '../services/pitchDetection';
import { exportService } from '../services/exportService';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function TranscriberPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [analyser, setAnalyser] = useState(null);
  const [currentPitch, setCurrentPitch] = useState(null);
  const [notes, setNotes] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    deviceId: null,
    sensitivity: 0.85,  // High sensitivity default
    noiseGate: -70,     // Very sensitive noise gate
    tempo: 120,
    timeSignature: '4/4',
    keySignature: 'C'
  });
  
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const sheetMusicRef = useRef(null);

  // Initialize pitch detection
  useEffect(() => {
    pitchDetection.initialize(44100);
    
    pitchDetection.onNoteOn = (note) => {
      setNotes(prev => [...prev, note]);
    };

    pitchDetection.onPitchUpdate = (detection) => {
      setCurrentPitch(detection);
    };

    return () => {
      pitchDetection.clearNotes();
    };
  }, []);

  // Update pitch detection settings
  useEffect(() => {
    pitchDetection.setThreshold(1 - settings.sensitivity);
    pitchDetection.setNoiseGate(settings.noiseGate);
  }, [settings.sensitivity, settings.noiseGate]);

  // Detection loop
  const runDetection = useCallback(() => {
    if (!audioCapture.isRecording) return;

    const audioBuffer = audioCapture.getTimeData();
    const detection = pitchDetection.detect(audioBuffer);
    pitchDetection.processNote(detection, startTimeRef.current);

    rafRef.current = requestAnimationFrame(runDetection);
  }, []);

  // Start recording
  const handleStartRecording = async () => {
    try {
      if (!isInitialized) {
        await audioCapture.initialize(settings.deviceId);
        // Increase gain for better sensitivity
        audioCapture.setGain(1.5);
        setAnalyser(audioCapture.getAnalyser());
        setIsInitialized(true);
      }

      audioCapture.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      
      // Start detection loop
      rafRef.current = requestAnimationFrame(runDetection);
      
      toast.success('Recording started', {
        description: 'Play your piano to begin transcription'
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Microphone access denied', {
        description: 'Please allow microphone access to use the transcriber'
      });
    }
  };

  // Stop recording
  const handleStopRecording = async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    audioCapture.stop();
    pitchDetection.endAllNotes();
    setIsRecording(false);
    setCurrentPitch(null);

    // Get final notes
    const detectedNotes = pitchDetection.getDetectedNotes();
    setNotes(detectedNotes);

    if (detectedNotes.length > 0) {
      toast.success('Recording stopped', {
        description: `${detectedNotes.length} notes detected`
      });
    } else {
      toast.info('Recording stopped', {
        description: 'No notes were detected'
      });
    }
  };

  // Clear notes
  const handleClear = () => {
    pitchDetection.clearNotes();
    setNotes([]);
    setCurrentPitch(null);
    toast.info('Transcription cleared');
  };

  // Export functions
  const handleExportPDF = async () => {
    const svgElement = sheetMusicRef.current?.querySelector('svg');
    exportService.setMetadata({
      title: `Piano Transcription ${new Date().toLocaleDateString()}`,
      tempo: settings.tempo,
      timeSignature: settings.timeSignature,
      keySignature: settings.keySignature
    });
    
    const filename = await exportService.exportToPDF(svgElement, notes);
    toast.success('PDF exported', { description: filename });
  };

  const handleExportMusicXML = () => {
    exportService.setMetadata({
      title: `Piano Transcription ${new Date().toLocaleDateString()}`,
      tempo: settings.tempo,
      timeSignature: settings.timeSignature,
      keySignature: settings.keySignature
    });
    
    const filename = exportService.exportToMusicXML(notes);
    toast.success('MusicXML exported', { description: filename });
  };

  const handleExportMIDI = () => {
    exportService.setMetadata({
      title: `Piano Transcription ${new Date().toLocaleDateString()}`,
      tempo: settings.tempo
    });
    
    const filename = exportService.exportToMIDI(notes);
    toast.success('MIDI exported', { description: filename });
  };

  // Save transcription to backend
  const handleSaveTranscription = async () => {
    if (notes.length === 0) return;

    try {
      const payload = {
        title: `Piano Transcription ${new Date().toLocaleDateString()}`,
        notes: notes.map(n => ({
          pitch: n.noteName,
          frequency: n.frequency,
          duration: n.duration || 0.5,
          start_time: n.relativeStartTime || 0,
          velocity: n.velocity || 80
        })),
        tempo: settings.tempo,
        time_signature: settings.timeSignature,
        key_signature: settings.keySignature,
        duration_seconds: notes.length > 0 
          ? Math.max(...notes.map(n => (n.relativeStartTime || 0) + (n.duration || 0.5)))
          : 0
      };

      await axios.post(`${API_URL}/api/transcriptions`, payload);
      toast.success('Transcription saved!');
    } catch (error) {
      console.error('Failed to save transcription:', error);
      toast.error('Failed to save transcription');
    }
  };

  return (
    <div 
      data-testid="transcriber-page"
      className="flex flex-col h-screen overflow-hidden"
    >
      <Header />

      {/* Main Content - Fully Responsive */}
      <main className="flex-1 overflow-auto p-3 md:p-6 lg:p-8">
        <div className="h-full max-w-7xl mx-auto flex flex-col gap-3 md:gap-6">
          
          {/* Mobile: Pitch Display on top */}
          <div className="block lg:hidden">
            <div className="grid grid-cols-2 gap-3">
              {/* Compact Pitch Display for Mobile */}
              <div className="glass rounded-xl p-3 border border-border/50">
                <div className="text-center">
                  <span className="font-mono text-3xl font-bold">
                    {currentPitch?.noteName || '--'}
                  </span>
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {currentPitch?.frequency > 0 ? `${currentPitch.frequency.toFixed(0)} Hz` : '--- Hz'}
                  </div>
                </div>
              </div>
              
              {/* Session Stats for Mobile */}
              <div className="glass rounded-xl p-3 border border-border/50">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                    <span className="text-sm font-medium">{isRecording ? 'Recording' : 'Ready'}</span>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {notes.length} notes • {settings.tempo} BPM
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 md:gap-6 min-h-0">
            
            {/* Sheet Music & Visualizer Section */}
            <div className="flex-1 flex flex-col gap-3 min-h-0 lg:min-w-0">
              {/* Sheet Music Canvas - Responsive height */}
              <div 
                ref={sheetMusicRef}
                className="flex-1 min-h-[150px] md:min-h-[250px] bg-card rounded-xl md:rounded-2xl border border-border/50 shadow-sm overflow-hidden"
              >
                <SheetMusicCanvas
                  notes={notes}
                  tempo={settings.tempo}
                  timeSignature={settings.timeSignature}
                  keySignature={settings.keySignature}
                />
              </div>

              {/* Audio Visualizer - Smaller on mobile */}
              <div className="h-16 md:h-24 lg:h-32 bg-card rounded-xl md:rounded-2xl border border-border/50 overflow-hidden flex-shrink-0">
                <AudioVisualizer
                  analyser={analyser}
                  isRecording={isRecording}
                />
              </div>
            </div>

            {/* Desktop Sidebar - Pitch Display & Stats */}
            <div className="hidden lg:flex lg:flex-col lg:w-72 gap-4 flex-shrink-0">
              <PitchDisplay
                currentNote={currentPitch?.noteName}
                frequency={currentPitch?.frequency || 0}
                volume={currentPitch?.volume || -60}
                isRecording={isRecording}
              />

              {/* Stats */}
              <div className="p-4 bg-card rounded-2xl border border-border/50">
                <h3 className="font-display text-lg font-medium mb-3">Session</h3>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notes</span>
                    <span>{notes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo</span>
                    <span>{settings.tempo} BPM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span>{settings.timeSignature}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Key</span>
                    <span>{settings.keySignature}</span>
                  </div>
                </div>
                
                {notes.length > 0 && !isRecording && (
                  <button
                    data-testid="save-transcription-btn"
                    onClick={handleSaveTranscription}
                    className="w-full mt-4 py-2 px-4 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Save Transcription
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile: Save button */}
          {notes.length > 0 && !isRecording && (
            <div className="block lg:hidden">
              <button
                data-testid="save-transcription-btn-mobile"
                onClick={handleSaveTranscription}
                className="w-full py-3 px-4 bg-accent text-accent-foreground rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Save Transcription ({notes.length} notes)
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Control Bar */}
      <ControlBar
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onClear={handleClear}
        onExportPDF={handleExportPDF}
        onExportMusicXML={handleExportMusicXML}
        onExportMIDI={handleExportMIDI}
        onOpenSettings={() => setShowSettings(true)}
        hasNotes={notes.length > 0}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}

export default TranscriberPage;
