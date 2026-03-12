import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Beam, Dot } from 'vexflow';

// Sheet Music Renderer using VexFlow
class SheetMusicRenderer {
  constructor() {
    this.renderer = null;
    this.context = null;
    this.containerWidth = 800;
    this.containerHeight = 400;
    this.staveWidth = 250;
    this.staveHeight = 120;
    this.stavesPerLine = 3;
    this.notes = [];
    this.tempo = 120;
    this.timeSignature = '4/4';
    this.keySignature = 'C';
    this.isDarkMode = true;
  }

  initialize(container, isDarkMode = true) {
    this.isDarkMode = isDarkMode;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Get container dimensions
    this.containerWidth = container.clientWidth || 400;
    this.containerHeight = container.clientHeight || 200;
    
    // Responsive stave width based on container
    this.staveWidth = Math.min(250, Math.max(150, this.containerWidth / 3));

    // Create VexFlow renderer
    this.renderer = new Renderer(container, Renderer.Backends.SVG);
    this.renderer.resize(this.containerWidth, this.containerHeight);
    
    this.context = this.renderer.getContext();
    
    // Set styling based on theme
    const strokeColor = isDarkMode ? '#EDEDED' : '#1A1A1A';
    const fillColor = isDarkMode ? '#EDEDED' : '#1A1A1A';
    
    this.context.setFont('Manrope', 12);
    this.context.setStrokeStyle(strokeColor);
    this.context.setFillStyle(fillColor);

    return this.context;
  }

  setTheme(isDarkMode) {
    this.isDarkMode = isDarkMode;
    if (this.context) {
      const strokeColor = isDarkMode ? '#EDEDED' : '#1A1A1A';
      const fillColor = isDarkMode ? '#EDEDED' : '#1A1A1A';
      this.context.setStrokeStyle(strokeColor);
      this.context.setFillStyle(fillColor);
    }
  }

  setTempo(tempo) {
    this.tempo = tempo;
  }

  setTimeSignature(timeSignature) {
    this.timeSignature = timeSignature;
  }

  setKeySignature(keySignature) {
    this.keySignature = keySignature;
  }

  // Convert note data to VexFlow format
  convertToVexFlowNote(noteData) {
    const { noteName, duration } = noteData;
    
    // Parse note name (e.g., "C#4" -> { key: "c#", octave: 4 })
    const match = noteName.match(/^([A-G])(#|b)?(\d+)$/);
    if (!match) return null;

    const [, letter, accidental, octave] = match;
    const key = letter.toLowerCase() + (accidental || '');
    
    // Convert duration in seconds to note value
    const beatDuration = 60 / this.tempo; // seconds per beat
    const durationRatio = duration / beatDuration;
    
    let noteValue;
    let isDotted = false;
    
    if (durationRatio >= 3.5) {
      noteValue = 'w';
    } else if (durationRatio >= 1.75) {
      noteValue = 'h';
    } else if (durationRatio >= 1.4) {
      noteValue = 'hd';
      isDotted = true;
    } else if (durationRatio >= 0.875) {
      noteValue = 'q';
    } else if (durationRatio >= 0.65) {
      noteValue = 'qd';
      isDotted = true;
    } else if (durationRatio >= 0.4375) {
      noteValue = '8';
    } else if (durationRatio >= 0.3) {
      noteValue = '8d';
      isDotted = true;
    } else {
      noteValue = '16';
    }

    return {
      keys: [`${key}/${octave}`],
      duration: noteValue.replace('d', ''),
      isDotted,
      accidental: accidental || null
    };
  }

  // Render notes on the staff
  render(notes = []) {
    if (!this.context) return;

    // Clear canvas
    this.context.clear();
    
    if (notes.length === 0) {
      this.renderEmptyStaff();
      return;
    }

    const vexNotes = notes
      .map(n => this.convertToVexFlowNote(n))
      .filter(n => n !== null);

    if (vexNotes.length === 0) {
      this.renderEmptyStaff();
      return;
    }

    // Group notes into measures
    const measures = this.groupIntoMeasures(vexNotes);
    
    // Calculate layout
    const measuresPerLine = Math.floor((this.containerWidth - 60) / this.staveWidth);
    const lines = Math.ceil(measures.length / measuresPerLine);

    let xPos = 30;
    let yPos = 40;

    for (let i = 0; i < measures.length; i++) {
      if (i > 0 && i % measuresPerLine === 0) {
        xPos = 30;
        yPos += this.staveHeight;
      }

      const isFirstOfLine = i % measuresPerLine === 0;
      const stave = new Stave(xPos, yPos, this.staveWidth);
      
      if (isFirstOfLine) {
        stave.addClef('treble');
        if (i === 0) {
          stave.addTimeSignature(this.timeSignature);
          stave.addKeySignature(this.keySignature);
        }
      }

      stave.setContext(this.context).draw();

      // Create VexFlow notes for this measure
      const measureNotes = measures[i].map(note => {
        const staveNote = new StaveNote({
          keys: note.keys,
          duration: note.duration,
          auto_stem: true
        });

        if (note.accidental) {
          staveNote.addModifier(new Accidental(note.accidental), 0);
        }

        if (note.isDotted) {
          Dot.buildAndAttach([staveNote], { all: true });
        }

        return staveNote;
      });

      if (measureNotes.length > 0) {
        // Create voice and format
        const voice = new Voice({ num_beats: 4, beat_value: 4 }).setStrict(false);
        voice.addTickables(measureNotes);

        new Formatter().joinVoices([voice]).format([voice], this.staveWidth - 50);
        voice.draw(this.context, stave);
      }

      xPos += this.staveWidth;
    }
  }

  // Render empty staff
  renderEmptyStaff() {
    const stave = new Stave(30, 40, this.containerWidth - 60);
    stave.addClef('treble');
    stave.addTimeSignature(this.timeSignature);
    stave.addKeySignature(this.keySignature);
    stave.setContext(this.context).draw();
  }

  // Group notes into measures based on time signature
  groupIntoMeasures(notes) {
    const [beatsPerMeasure] = this.timeSignature.split('/').map(Number);
    const measures = [];
    let currentMeasure = [];
    let currentBeats = 0;
    const beatDuration = 60 / this.tempo;

    const noteDurations = {
      'w': 4,
      'h': 2,
      'q': 1,
      '8': 0.5,
      '16': 0.25,
      '32': 0.125
    };

    for (const note of notes) {
      const beats = noteDurations[note.duration] || 1;
      
      if (currentBeats + beats > beatsPerMeasure) {
        if (currentMeasure.length > 0) {
          measures.push(currentMeasure);
        }
        currentMeasure = [note];
        currentBeats = beats;
      } else {
        currentMeasure.push(note);
        currentBeats += beats;
      }
    }

    if (currentMeasure.length > 0) {
      measures.push(currentMeasure);
    }

    return measures;
  }

  // Real-time update with new note
  addNote(noteData) {
    this.notes.push(noteData);
    this.render(this.notes);
  }

  // Clear all notes
  clear() {
    this.notes = [];
    if (this.context) {
      this.context.clear();
      this.renderEmptyStaff();
    }
  }

  // Get current notes
  getNotes() {
    return [...this.notes];
  }

  // Set notes
  setNotes(notes) {
    this.notes = notes;
    this.render(this.notes);
  }

  // Resize handler
  resize(width, height) {
    if (this.renderer) {
      this.containerWidth = width;
      this.containerHeight = height;
      this.renderer.resize(width, height);
      this.render(this.notes);
    }
  }
}

export const sheetMusicRenderer = new SheetMusicRenderer();
export default SheetMusicRenderer;
