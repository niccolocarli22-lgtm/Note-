import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Music, Clock, Trash2, Download, FileText, FileMusic, Eye } from 'lucide-react';
import axios from 'axios';
import { Header } from '../components/Header';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { formatDuration, formatTimestamp } from '../lib/utils';
import { exportService } from '../services/exportService';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function HistoryPage() {
  const [transcriptions, setTranscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState(null);

  useEffect(() => {
    fetchTranscriptions();
  }, []);

  const fetchTranscriptions = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/transcriptions`);
      setTranscriptions(response.data);
    } catch (error) {
      console.error('Failed to fetch transcriptions:', error);
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/transcriptions/${id}`);
      setTranscriptions(prev => prev.filter(t => t.id !== id));
      toast.success('Transcription deleted');
    } catch (error) {
      console.error('Failed to delete transcription:', error);
      toast.error('Failed to delete transcription');
    }
  };

  const handleExportMIDI = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/transcriptions/${id}`);
      const transcription = response.data;
      
      exportService.setMetadata({
        title: transcription.title,
        tempo: transcription.tempo
      });
      
      const notes = transcription.notes.map(n => ({
        noteName: n.pitch,
        frequency: n.frequency,
        duration: n.duration,
        relativeStartTime: n.start_time,
        velocity: n.velocity
      }));
      
      exportService.exportToMIDI(notes);
      toast.success('MIDI exported');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export');
    }
  };

  const handleExportMusicXML = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/transcriptions/${id}`);
      const transcription = response.data;
      
      exportService.setMetadata({
        title: transcription.title,
        tempo: transcription.tempo,
        timeSignature: transcription.time_signature,
        keySignature: transcription.key_signature
      });
      
      const notes = transcription.notes.map(n => ({
        noteName: n.pitch,
        frequency: n.frequency,
        duration: n.duration
      }));
      
      exportService.exportToMusicXML(notes);
      toast.success('MusicXML exported');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export');
    }
  };

  return (
    <div 
      data-testid="history-page"
      className="min-h-screen flex flex-col"
    >
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-2">
              Your <span className="italic text-gradient-gold">Transcriptions</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              View and export your saved piano transcriptions
            </p>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : transcriptions.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-display text-xl font-medium mb-2">No transcriptions yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start recording your piano to create your first transcription
                </p>
                <Link to="/">
                  <Button className="bg-gradient-gold text-black hover:opacity-90 rounded-full">
                    Start Transcribing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {transcriptions.map((transcription) => (
                <Card 
                  key={transcription.id}
                  data-testid={`transcription-card-${transcription.id}`}
                  className="group hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg font-medium line-clamp-1">
                      {transcription.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Music className="w-4 h-4" />
                        <span>{transcription.note_count} notes</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(transcription.duration_seconds)}</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 font-mono">
                      <span>{transcription.tempo} BPM</span>
                      <span>•</span>
                      <span>{transcription.time_signature}</span>
                      <span>•</span>
                      <span>{transcription.key_signature}</span>
                    </div>

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mb-4">
                      {formatTimestamp(transcription.created_at)}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 rounded-full"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleExportMusicXML(transcription.id)}>
                            <FileText className="w-4 h-4 mr-2" />
                            MusicXML
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportMIDI(transcription.id)}>
                            <FileMusic className="w-4 h-4 mr-2" />
                            MIDI
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transcription</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{transcription.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(transcription.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HistoryPage;
