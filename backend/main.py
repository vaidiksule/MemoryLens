import cv2
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from fastapi.middleware.cors import CORSMiddleware


from models import add_person, add_memory, get_all_people, get_latest_memory
from recognition import decode_base64_image, get_face_embeddings, face_cache
from speech import transcribe_audio
from memory import summarize_conversation

app = FastAPI(title="MemoryLens Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Load all people from DB into face cache
    people = await get_all_people()
    face_cache.update(people)
    print(f"Face cache loaded with {len(people)} people.")


@app.post("/register-face")
async def register_face(name: str = Form(...), image_base64: str = Form(...)):
    """Registers a new face with a name."""
    try:
        img = decode_base64_image(image_base64)
        faces = get_face_embeddings(img)

        if not faces:
            raise HTTPException(status_code=400, detail="No face detected in image")

        # Take the first face detected
        embedding = faces[0]["embedding"]
        person_id = await add_person(name, embedding)

        # Update cache
        people = await get_all_people()
        face_cache.update(people)

        return {"status": "success", "person_id": person_id, "name": name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/add-memory")
async def add_memory_endpoint(person_id: str = Form(...), transcript: str = Form(...)):
    """Saves a memory for a specific person."""
    try:
        summary_data = summarize_conversation(transcript)
        memory_id = await add_memory(
            person_id,
            transcript,
            summary_data["summary"],
            summary_data["key_topics"],
            summary_data["emotional_tone"],
            summary_data.get("follow_up_suggestion"),
        )
        return {"status": "success", "memory_id": memory_id, "summary": summary_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/transcribe")
async def transcribe_endpoint(audio: UploadFile = File(...)):
    """Transcribes an audio file."""
    try:
        audio_bytes = await audio.read()
        transcript = await transcribe_audio(audio_bytes)
        return {"transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/recognition")
async def websocket_recognition(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Expecting base64 image string
            data = await websocket.receive_text()
            try:
                img = decode_base64_image(data)
                # Resize image for performance
                height, width = img.shape[:2]
                if width > 480:
                    scale = 480 / width
                    img = cv2.resize(img, (480, int(height * scale)))

                faces = get_face_embeddings(img)
                response_data = []

                for face in faces:
                    match = face_cache.match(face["embedding"])
                    if match:
                        person_id, name, sim = match
                        latest_memory = await get_latest_memory(person_id)

                        memory_summary = ""
                        last_met = "Never"
                        if latest_memory:
                            memory_summary = latest_memory.summary
                            last_met = latest_memory.timestamp.strftime("%Y-%m-%d")

                        response_data.append(
                            {
                                "name": name,
                                "person_id": person_id,
                                "last_met": last_met,
                                "summary": memory_summary,
                                "bbox": face["bbox"],  # [top, right, bottom, left]
                                "similarity": float(sim),
                            }
                        )
                    else:
                        response_data.append({"name": "Unknown", "bbox": face["bbox"]})

                await websocket.send_json(response_data)
            except Exception as e:
                print(f"WS processing error: {e}")
                await websocket.send_json({"error": "Processing failed"})

    except WebSocketDisconnect:
        print("Websocket disconnected")
    except Exception as e:
        print(f"Websocket error: {e}")
