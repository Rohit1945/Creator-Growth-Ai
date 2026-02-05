External Video Processing Server Plan

Stack:
- Node.js
- Express
- Multer
- FFmpeg
- Whisper / Speech-to-Text API

Flow:
1. Receive video file
2. Convert video → low bitrate audio (16kHz mono)
3. Transcribe audio
4. Send transcript JSON to frontend
5. Delete temp files

Key fixes:
- CORS enabled
- Always return JSON
- File size limit (50MB)
- Timeout-safe processing
