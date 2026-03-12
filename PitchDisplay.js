import { useTheme } from '../contexts/ThemeContext';

export function PitchDisplay({ 
  currentNote = null, 
  frequency = 0, 
  volume = -60,
  isRecording = false 
}) {
  const { theme } = useTheme();
  
  const volumePercent = Math.min(100, Math.max(0, (volume + 60) * 1.67));
  
  return (
    <div 
      data-testid="pitch-display"
      className={`
        glass rounded-2xl p-6 border border-border/50
        transition-all duration-300
        ${isRecording ? 'shadow-gold' : ''}
      `}
    >
      <div className="text-center">
        {/* Note Name */}
        <div className="mb-4">
          <span className="font-mono text-6xl font-bold tracking-tight">
            {currentNote || '--'}
          </span>
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <span className="font-mono text-lg text-muted-foreground">
            {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '--- Hz'}
          </span>
        </div>

        {/* Volume Meter */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>Volume</span>
            <span>{volume > -60 ? `${volume.toFixed(0)} dB` : '-∞ dB'}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-75 ${
                isRecording 
                  ? 'bg-gradient-gold' 
                  : 'bg-muted-foreground/30'
              }`}
              style={{ width: `${volumePercent}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isRecording 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-muted-foreground/30'
            }`}
          />
          <span className="text-sm text-muted-foreground">
            {isRecording ? 'Listening...' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PitchDisplay;
