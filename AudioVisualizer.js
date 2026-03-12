import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function AudioVisualizer({ analyser, isRecording, className = '' }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const { theme } = useTheme();

  const draw = useCallback(() => {
    if (!canvasRef.current || !analyser) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Get frequency data
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set colors based on theme
    const isDark = theme === 'dark';
    const primaryColor = isDark ? '#D4AF37' : '#D4AF37';
    const secondaryColor = isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.2)';
    const backgroundColor = 'transparent';

    // Draw background glow when recording
    if (isRecording) {
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, width / 2
      );
      gradient.addColorStop(0, 'rgba(225, 29, 72, 0.1)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw bars
    const barCount = 64;
    const barWidth = (width / barCount) * 0.8;
    const barSpacing = (width / barCount) * 0.2;
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const dataIndex = i * step;
      const value = dataArray[dataIndex];
      const barHeight = (value / 255) * height * 0.8;

      const x = i * (barWidth + barSpacing);
      const y = (height - barHeight) / 2;

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
      gradient.addColorStop(0, secondaryColor);
      gradient.addColorStop(1, primaryColor);

      ctx.fillStyle = gradient;
      
      // Draw rounded bars
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    }

    // Draw center line
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(draw);
  }, [analyser, theme, isRecording]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (analyser && isRecording) {
      draw();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      // Clear canvas when not recording
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isRecording, draw]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="audio-visualizer"
      className={`w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}

export default AudioVisualizer;
