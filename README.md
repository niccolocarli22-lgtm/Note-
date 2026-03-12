# SonataFlow - AI Piano Transcriber

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with MONGO_URL and DB_NAME
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# Create .env with REACT_APP_BACKEND_URL=http://localhost:8001
yarn start
```

## Features
- Real-time piano transcription via microphone
- VexFlow sheet music rendering
- Export to PDF, MusicXML, MIDI
- Light/Dark theme toggle
- Responsive design

Built with Emergent AI
