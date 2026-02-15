# MemoryLens - Architecture & Flow Documentation

## 1. High Level Architecture

MemoryLens is a "Social Augmented Memory" tool. It consists of:
- **Frontend**: Next.js + React Webcam. Handles video capture, overlay rendering (boxes over faces), and audio recording.
- **Backend**: FastAPI (Python). Handles face recognition (InsightFace), database storage (MongoDB), and LLM processing (Gemini).
- **Services**:
  - **Deepgram**: For Speech-to-Text (Transcribing what you say).
  - **Gemini (Google AI)**: For summarizing the conversation and extracting names.
  - **InsightFace**: For detecting faces and generating "embeddings" (unique numerical fingerprints for faces).
  - **MongoDB**: For storing persistent user profiles and memory history.

---

## 2. The Core Loop (How it works)

### Step 1: The "Start"
- The user clicks **"Start MemoryLens AI"**.
- The frontend opens a **WebSocket connection** (`ws://localhost:8000/ws/recognition`) to the backend.

### Step 2: The Visual Loop (Real-time Vision)
- **Every 1.5 seconds**, the frontend takes a screenshot from the webcam.
- It sends this image (Base64) to the backend via WebSocket.
- **Backend Processing**:
  - Receives the image.
  - Runs `InsightFace` to find faces.
  - Compares the found face against the **Face Cache** (in-memory list of known people from MongoDB).
  - Returns `[ { "name": "Vedic", "bbox": [...] } ]` or `[ { "name": "Unknown", ... } ]`.
- **Frontend Update**:
  - Draws a box around the face.
  - If it's a known person ("Vedic"), it shows their "Last Met" date and "Previous Summary".

### Step 3: The "Frontier" Recording Logic
- The frontend watches the `faces` state.
- **Trigger**: IF `faces.length > 0` (You are looking at someone) AND `!isRecording`...
  - **ACTION**: Start the microphone (`MediaRecorder`).
- **Logic**: We assume if you are looking at someone, you might start talking to them.

### Step 4: Silence Detection (The "Stop" Trigger)
- The microphone records data in chunks.
- We have a **Silence Timer** (set to **3 seconds**).
- **Rule**: Every time you speak (audio data arrives), *reset* the timer.
- **Trigger**: If you STOP speaking for 3 full seconds, the timer fires.
  - **ACTION**: `recorder.stop()` is called.

### Step 5: Processing the Memory (The "Chain")
1.  **Frontend**:
    - Takes the recorded `audioBlob`.
    - Takes the *current* webcam screenshot.
    - Sends both to the backend endpoint `/transcribe` (internal) -> then `/add-memory`.

2.  **Backend (`/add-memory`)**:
    - **A. Transcribe**: Sends audio to **Deepgram** (using raw HTTP POST for speed/stability).
      - *Result*: "Hi it's me Vedic and I'm good."
    - **B. Summarize**: Sends transcript to **Gemini**.
      - *Result JSON*: `{ "summary": "Vedic is doing well.", "extracted_name": "Vedic", ... }`
    - **C. Name Extraction Fallback**:
      - If Gemini misses the name, we run a **Regex Pattern Match** (`r"my name is ([A-Z]+)"`) as a failsafe.
    - **D. Auto-Registration Logic**:
      - IF the face was "Unknown" (no `person_id`) ...
      - AND we extracted a name ("Vedic") ...
      - AND we have a face image ...
      - **ACTION**: Create a NEW entry in MongoDB (`people` collection) for "Vedic" with this face embedding.
    - **E. Save Memory**:
      - Save the conversation summary to MongoDB (`memories` collection), linked to "Vedic".

### Step 6: The Feedback Loop
- The backend returns `success`.
- The frontend shows a toast: **"Memory stored for Vedic"**.
- The frontend *instantly* updates the "Unknown" label to **"Vedic"** without waiting for the next WebSocket frame, so the UI feels snappy.

---

## 3. Deepgram Configuration

We use **Deepgram Nova-2** model.
- **Why?**: It is the fastest and most accurate model currently available for conversational audio.
- **Method**: HTTP POST Request (not streaming).
  - We send the *entire* audio file (blob) after the silence is detected.
  - We do *not* stream byte-by-byte because we want the full context for the LLM summary.
- **Parameters**: `smart_format=true` (Adding punctuation is critical for Gemini to understand who is speaking).

```python
# Detailed in backend/speech.py
url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
```

## 4. Troubleshooting "No Person Identified"

If you see this error, it means:
1.  **Audio was too quiet**: Deepgram returned an empty transcript.
2.  **No Name Spoken**: You spoke, but didn't say "It's me [Name]" clearly enough for Regex or Gemini to catch it.
3.  **Face Blurry**: You provided an image, but InsightFace couldn't find a clear face to generate an embedding for.
