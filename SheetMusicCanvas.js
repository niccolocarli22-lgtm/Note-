import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { sheetMusicRenderer } from '../services/sheetMusicRenderer';

export function SheetMusicCanvas({ 
  notes = [], 
  tempo = 120, 
  timeSignature = '4/4',
  keySignature = 'C',
  className = '' 
}) {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  const initializeRenderer = useCallback(() => {
    if (!containerRef.current) return;

    const isDarkMode = theme === 'dark';
    sheetMusicRenderer.initialize(containerRef.current, isDarkMode);
    sheetMusicRenderer.setTempo(tempo);
    sheetMusicRenderer.setTimeSignature(timeSignature);
    sheetMusicRenderer.setKeySignature(keySignature);
    
    if (notes.length > 0) {
      sheetMusicRenderer.render(notes);
    } else {
      sheetMusicRenderer.renderEmptyStaff();
    }
  }, [theme, tempo, timeSignature, keySignature, notes]);

  useEffect(() => {
    initializeRenderer();
  }, [initializeRenderer]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        sheetMusicRenderer.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sheetMusicRenderer.setTheme(theme === 'dark');
    if (containerRef.current) {
      initializeRenderer();
    }
  }, [theme, initializeRenderer]);

  useEffect(() => {
    sheetMusicRenderer.setTempo(tempo);
    sheetMusicRenderer.setTimeSignature(timeSignature);
    sheetMusicRenderer.setKeySignature(keySignature);
    sheetMusicRenderer.render(notes);
  }, [notes, tempo, timeSignature, keySignature]);

  return (
    <div
      ref={containerRef}
      data-testid="sheet-music-canvas"
      className={`w-full h-full min-h-[200px] ${theme === 'dark' ? 'bg-card' : 'bg-white'} rounded-xl overflow-hidden ${className}`}
      style={{
        background: theme === 'dark' ? 'hsl(var(--card))' : '#FFFFFF'
      }}
    />
  );
}

export default SheetMusicCanvas;
