import { Mic, Square, Download, Settings, RotateCcw, FileText, Music, FileMusic } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function ControlBar({
  isRecording,
  onStartRecording,
  onStopRecording,
  onClear,
  onExportPDF,
  onExportMusicXML,
  onExportMIDI,
  onOpenSettings,
  hasNotes = false,
  disabled = false
}) {
  return (
    <div 
      data-testid="control-bar"
      className="glass border-t border-border/50 p-4"
    >
      <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
        {/* Recording Button */}
        {!isRecording ? (
          <Button
            data-testid="start-recording-btn"
            onClick={onStartRecording}
            disabled={disabled}
            size="lg"
            className="bg-gradient-gold text-black hover:opacity-90 shadow-gold rounded-full px-8 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Mic className="w-5 h-5 mr-2" />
            Start Recording
          </Button>
        ) : (
          <Button
            data-testid="stop-recording-btn"
            onClick={onStopRecording}
            size="lg"
            className="bg-red-600 text-white hover:bg-red-700 recording-glow animate-pulse-slow rounded-full px-8 py-6 text-lg font-semibold transition-all duration-300"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop Recording
          </Button>
        )}

        {/* Clear Button */}
        <Button
          data-testid="clear-btn"
          onClick={onClear}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
          disabled={!hasNotes || isRecording}
        >
          <RotateCcw className="w-5 h-5" />
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              data-testid="export-btn"
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12"
              disabled={!hasNotes || isRecording}
            >
              <Download className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem 
              data-testid="export-pdf-btn"
              onClick={onExportPDF}
              className="cursor-pointer"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              data-testid="export-musicxml-btn"
              onClick={onExportMusicXML}
              className="cursor-pointer"
            >
              <Music className="w-4 h-4 mr-2" />
              Export as MusicXML
            </DropdownMenuItem>
            <DropdownMenuItem 
              data-testid="export-midi-btn"
              onClick={onExportMIDI}
              className="cursor-pointer"
            >
              <FileMusic className="w-4 h-4 mr-2" />
              Export as MIDI
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Button */}
        <Button
          data-testid="settings-btn"
          onClick={onOpenSettings}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
          disabled={isRecording}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

export default ControlBar;
