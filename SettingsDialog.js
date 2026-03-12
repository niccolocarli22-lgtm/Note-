import { useState, useEffect } from 'react';
import { Settings, Volume2, Music, Clock, Mic } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import AudioCaptureService from '../services/audioCapture';

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}) {
  const [audioDevices, setAudioDevices] = useState([]);

  useEffect(() => {
    const loadDevices = async () => {
      const devices = await AudioCaptureService.getAudioDevices();
      setAudioDevices(devices);
    };
    
    if (open) {
      loadDevices();
    }
  }, [open]);

  const handleChange = (key, value) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="settings-dialog"
        className="sm:max-w-[500px] glass"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Settings className="w-6 h-6" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure audio input and transcription parameters
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Microphone Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Mic className="w-4 h-4" />
              Microphone
            </Label>
            <Select
              value={settings.deviceId || 'default'}
              onValueChange={(value) => handleChange('deviceId', value === 'default' ? null : value)}
            >
              <SelectTrigger data-testid="microphone-select">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default Microphone</SelectItem>
                {audioDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sensitivity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Volume2 className="w-4 h-4" />
                Sensitivity
              </Label>
              <span className="font-mono text-sm text-muted-foreground">
                {(settings.sensitivity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              data-testid="sensitivity-slider"
              value={[settings.sensitivity * 100]}
              onValueChange={([value]) => handleChange('sensitivity', value / 100)}
              min={10}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Higher sensitivity detects quieter notes
            </p>
          </div>

          {/* Noise Gate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                Noise Gate
              </Label>
              <span className="font-mono text-sm text-muted-foreground">
                {settings.noiseGate} dB
              </span>
            </div>
            <Slider
              data-testid="noise-gate-slider"
              value={[settings.noiseGate]}
              onValueChange={([value]) => handleChange('noiseGate', value)}
              min={-90}
              max={-30}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Sounds below this threshold will be ignored
            </p>
          </div>

          {/* Tempo */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Tempo (BPM)
              </Label>
              <span className="font-mono text-sm text-muted-foreground">
                {settings.tempo} BPM
              </span>
            </div>
            <Slider
              data-testid="tempo-slider"
              value={[settings.tempo]}
              onValueChange={([value]) => handleChange('tempo', value)}
              min={40}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          {/* Time Signature */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Music className="w-4 h-4" />
              Time Signature
            </Label>
            <Select
              value={settings.timeSignature}
              onValueChange={(value) => handleChange('timeSignature', value)}
            >
              <SelectTrigger data-testid="time-signature-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4/4">4/4 (Common Time)</SelectItem>
                <SelectItem value="3/4">3/4 (Waltz)</SelectItem>
                <SelectItem value="2/4">2/4 (March)</SelectItem>
                <SelectItem value="6/8">6/8 (Compound)</SelectItem>
                <SelectItem value="5/4">5/4</SelectItem>
                <SelectItem value="7/8">7/8</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Key Signature */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              Key Signature
            </Label>
            <Select
              value={settings.keySignature}
              onValueChange={(value) => handleChange('keySignature', value)}
            >
              <SelectTrigger data-testid="key-signature-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C">C Major / A minor</SelectItem>
                <SelectItem value="G">G Major / E minor</SelectItem>
                <SelectItem value="D">D Major / B minor</SelectItem>
                <SelectItem value="A">A Major / F# minor</SelectItem>
                <SelectItem value="E">E Major / C# minor</SelectItem>
                <SelectItem value="F">F Major / D minor</SelectItem>
                <SelectItem value="Bb">Bb Major / G minor</SelectItem>
                <SelectItem value="Eb">Eb Major / C minor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog;
