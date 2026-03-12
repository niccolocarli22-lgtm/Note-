from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import zipfile
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="SonataFlow API", description="AI Piano Transcriber Backend")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class NoteData(BaseModel):
    pitch: str
    frequency: float
    duration: float
    start_time: float
    velocity: int = 80

class TranscriptionCreate(BaseModel):
    title: str
    notes: List[NoteData]
    tempo: int = 120
    time_signature: str = "4/4"
    key_signature: str = "C"
    duration_seconds: float

class Transcription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    notes: List[NoteData]
    tempo: int = 120
    time_signature: str = "4/4"
    key_signature: str = "C"
    duration_seconds: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TranscriptionSummary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    title: str
    tempo: int
    time_signature: str
    key_signature: str
    duration_seconds: float
    note_count: int
    created_at: datetime

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "SonataFlow API - AI Piano Transcriber"}

# Health check
@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "sonataflow-api"}

# Status endpoints
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# Transcription endpoints
@api_router.post("/transcriptions", response_model=Transcription, status_code=201)
async def create_transcription(input: TranscriptionCreate):
    transcription = Transcription(
        title=input.title,
        notes=[note.model_dump() for note in input.notes],
        tempo=input.tempo,
        time_signature=input.time_signature,
        key_signature=input.key_signature,
        duration_seconds=input.duration_seconds
    )
    
    doc = transcription.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.transcriptions.insert_one(doc)
    return transcription

@api_router.get("/transcriptions", response_model=List[TranscriptionSummary])
async def get_transcriptions(limit: int = 50, skip: int = 0):
    transcriptions = await db.transcriptions.find(
        {}, 
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    summaries = []
    for t in transcriptions:
        if isinstance(t['created_at'], str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
        
        summaries.append(TranscriptionSummary(
            id=t['id'],
            title=t['title'],
            tempo=t.get('tempo', 120),
            time_signature=t.get('time_signature', '4/4'),
            key_signature=t.get('key_signature', 'C'),
            duration_seconds=t['duration_seconds'],
            note_count=len(t.get('notes', [])),
            created_at=t['created_at']
        ))
    
    return summaries

@api_router.get("/transcriptions/{transcription_id}", response_model=Transcription)
async def get_transcription(transcription_id: str):
    doc = await db.transcriptions.find_one(
        {"id": transcription_id},
        {"_id": 0}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    if isinstance(doc['created_at'], str):
        doc['created_at'] = datetime.fromisoformat(doc['created_at'])
    if isinstance(doc['updated_at'], str):
        doc['updated_at'] = datetime.fromisoformat(doc['updated_at'])
    
    return Transcription(**doc)

@api_router.put("/transcriptions/{transcription_id}", response_model=Transcription)
async def update_transcription(transcription_id: str, input: TranscriptionCreate):
    existing = await db.transcriptions.find_one({"id": transcription_id})
    
    if not existing:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    update_data = {
        "title": input.title,
        "notes": [note.model_dump() for note in input.notes],
        "tempo": input.tempo,
        "time_signature": input.time_signature,
        "key_signature": input.key_signature,
        "duration_seconds": input.duration_seconds,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transcriptions.update_one(
        {"id": transcription_id},
        {"$set": update_data}
    )
    
    updated_doc = await db.transcriptions.find_one(
        {"id": transcription_id},
        {"_id": 0}
    )
    
    if isinstance(updated_doc['created_at'], str):
        updated_doc['created_at'] = datetime.fromisoformat(updated_doc['created_at'])
    if isinstance(updated_doc['updated_at'], str):
        updated_doc['updated_at'] = datetime.fromisoformat(updated_doc['updated_at'])
    
    return Transcription(**updated_doc)

@api_router.delete("/transcriptions/{transcription_id}")
async def delete_transcription(transcription_id: str):
    result = await db.transcriptions.delete_one({"id": transcription_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transcription not found")
    
    return {"message": "Transcription deleted successfully", "id": transcription_id}

# Download source code as ZIP
@api_router.get("/download-source")
async def download_source_code():
    """Download all source code as a ZIP file"""
    import tempfile
    import shutil
    
    # Create temporary ZIP file
    zip_path = "/tmp/sonataflow-source-code.zip"
    
    app_dir = Path("/app")
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Backend files
        backend_files = [
            "backend/server.py",
            "backend/requirements.txt",
        ]
        for f in backend_files:
            file_path = app_dir / f
            if file_path.exists():
                zipf.write(file_path, f)
        
        # Frontend source files
        frontend_src = app_dir / "frontend" / "src"
        if frontend_src.exists():
            for file_path in frontend_src.rglob("*"):
                if file_path.is_file() and "__pycache__" not in str(file_path):
                    arcname = f"frontend/src/{file_path.relative_to(frontend_src)}"
                    zipf.write(file_path, arcname)
        
        # Frontend config files
        frontend_configs = [
            "frontend/package.json",
            "frontend/tailwind.config.js",
            "frontend/postcss.config.js",
            "frontend/craco.config.js",
        ]
        for f in frontend_configs:
            file_path = app_dir / f
            if file_path.exists():
                zipf.write(file_path, f)
        
        # Frontend public folder
        frontend_public = app_dir / "frontend" / "public"
        if frontend_public.exists():
            for file_path in frontend_public.rglob("*"):
                if file_path.is_file():
                    arcname = f"frontend/public/{file_path.relative_to(frontend_public)}"
                    zipf.write(file_path, arcname)
        
        # Design guidelines and docs
        if (app_dir / "design_guidelines.json").exists():
            zipf.write(app_dir / "design_guidelines.json", "design_guidelines.json")
        
        # Add README
        readme_content = """# SonataFlow - AI Piano Transcriber

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
"""
        zipf.writestr("README.md", readme_content)
        
        # Add sample .env files
        zipf.writestr("backend/.env.example", 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="sonataflow"\nCORS_ORIGINS="*"')
        zipf.writestr("frontend/.env.example", 'REACT_APP_BACKEND_URL=http://localhost:8001')
    
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename="sonataflow-source-code.zip"
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
