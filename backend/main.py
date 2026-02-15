import cv2
import asyncio
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from starlette.websockets import WebSocketState
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional


from models import (
    add_person,
    add_memory,
    get_all_people,
    get_latest_memory,
    get_all_people_with_latest_memory,
    get_person_memories,
    find_person_by_name,
)
from recognition import decode_base64_image, get_face_embeddings, face_cache
from speech import transcribe_audio
from memory import summarize_conversation, extract_name_from_transcript

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
    # Database reload trigger 2
    # Database reload trigger


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
async def add_memory_endpoint(
    person_id: Optional[str] = Form(None),
    transcript: str = Form(...),
    image_base64: Optional[str] = Form(None),
):
    """Saves a memory. If person_id is missing, tries to extract name and register face."""
    try:
        print("\n--- DEBUG: add_memory_endpoint CALLED ---")
        print(
            f"DEBUG: Input - person_id: '{person_id}', transcript: '{transcript[:100]}...', has_image: {bool(image_base64)}"
        )

        # 1. Summarize Conversation
        # We send the transcript to Gemini to get a structured JSON summary (summary, tone, topics).
        summary_data = summarize_conversation(transcript)
        print(f"DEBUG: Gemini raw summary: {summary_data}")

        final_person_id = person_id if person_id and person_id != "" else None

        # Try to find a name if Gemini didn't find one in the standard summary
        extracted_name = summary_data.get("extracted_name")
        if not extracted_name:
            print("DEBUG: No name in summary, checking extra extractor...")
            extra_name_data = extract_name_from_transcript(transcript)
            extracted_name = extra_name_data.get("name")
            print(f"DEBUG: Second pass extracted name: {extracted_name}")

        # 3. Automated Registration Case
        # If we have NO person_id (i.e. face was "Unknown") AND we have an image AND we extracted a name:
        # We attempt to register this person as a NEW entry in the database.
        if not final_person_id and image_base64 and extracted_name:
            print(f"DEBUG: ATTEMPTING AUTO-REGISTRATION for: {extracted_name}")
            img = decode_base64_image(image_base64)
            faces = get_face_embeddings(img)
            print(f"DEBUG: Face detection found {len(faces)} faces")

            if faces:
                print(f"DEBUG: Face detection found {len(faces)} faces")

                if len(faces) > 1:
                    print(
                        "DEBUG: SKIPPING AUTO-REGISTRATION - Multiple faces detected, cannot confidently assign name."
                    )
                    # Optionally return partial success with specific message
                else:
                    # 4. Check if person already exists by name before registering
                    existing_person = await find_person_by_name(extracted_name)

                    if existing_person:
                        # Person exists! Link to them instead of creating duplicate
                        final_person_id = str(existing_person.id)
                        print(
                            f"DEBUG: Found existing person via name match: {extracted_name} (ID: {final_person_id})"
                        )
                        # Optional: We could update their face embedding here if needed, but let's keep it simple.
                    else:
                        # Register as NEW person
                        # We save the embedding and the extracted name to the `people` collection.
                        embedding = faces[0]["embedding"]
                        final_person_id = await add_person(extracted_name, embedding)
                        print(
                            f"DEBUG: New person added successfully. ID: {final_person_id}"
                        )

                    # Update cache so subsequent frames immediately recognize this person
                    people = await get_all_people()
                    face_cache.update(people)
                    print(
                        f"DEBUG: Face cache updated. New size: {len(face_cache.cache)}"
                    )
                    summary_data["name"] = (
                        extracted_name  # Return name for frontend reflection
                    )
            else:
                print(
                    "DEBUG: FAILED - No faces detected in image provided for registration"
                )

        if not final_person_id:
            # DEBUG: If no person was identified or registered only (partial success)
            # This happens if Gemini didn't find a name, or if the face was not distinguishable enough to register.
            # We return the summary anyway so the UI could show "Conversation recorded but no person identified".
            print("DEBUG: RESULT - Partial success (No profile linked)")
            return {
                "status": "partial_success",
                "message": "No person identified or registered to link memory",
                "summary": summary_data,
            }

        print(f"DEBUG: Saving memory to DB for ID: {final_person_id}")

        # 5. Save the Full Memory
        # Now that we have a valid Person ID (either existing or newly registered),
        # we save the transcript, summary, topics, and tone into the `memories` collection.
        memory_id = await add_memory(
            final_person_id,
            transcript,
            summary_data["summary"],
            summary_data["key_topics"],
            summary_data["emotional_tone"],
            summary_data.get("follow_up_suggestion"),
        )
        print(f"DEBUG: RESULT - Success. Memory ID: {memory_id}")

        # 6. Return Success
        # The frontend receives this and updates the UI bubbles/toasts.
        return {
            "status": "success",
            "person_id": final_person_id,
            "memory_id": memory_id,
            "summary": summary_data,
        }
    except Exception as e:
        print(f"DEBUG ERROR: add_memory_endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/people")
async def list_people():
    """Returns all people with their latest summary."""
    try:
        results = await get_all_people_with_latest_memory()
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/people/{person_id}/memories")
async def person_history(person_id: str):
    """Returns all memories for a specific person."""
    try:
        memories = await get_person_memories(person_id)
        return memories
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
            # 1. Receive Frame
            # Frontend sends a Base64 string of the webcam frame every ~1.5s
            data = await websocket.receive_text()
            try:
                img = decode_base64_image(data)
                # Resize image for performance
                height, width = img.shape[:2]
                scale = 1.0
                if width > 480:
                    scale = 480 / width
                    img = cv2.resize(img, (480, int(height * scale)))

                faces = get_face_embeddings(img)
                response_data = []

                for face in faces:
                    # Rescale bbox back to original image size
                    rescaled_bbox = [
                        int(face["bbox"][0] / scale),  # top
                        int(face["bbox"][1] / scale),  # right
                        int(face["bbox"][2] / scale),  # bottom
                        int(face["bbox"][3] / scale),  # left
                    ]

                    match = face_cache.match(face["embedding"])
                    if match:
                        person_id, name, sim = match
                        latest_memory = await get_latest_memory(person_id)

                        memory_summary = None
                        last_met = "No previous history"
                        if latest_memory:
                            memory_summary = latest_memory.summary
                            last_met = latest_memory.timestamp.strftime("%Y-%m-%d")

                        response_data.append(
                            {
                                "name": name,
                                "person_id": person_id,
                                "last_met": last_met,
                                "summary": memory_summary,
                                "bbox": rescaled_bbox,
                                "similarity": float(sim),
                            }
                        )
                    else:
                        response_data.append({"name": "Unknown", "bbox": rescaled_bbox})

                await websocket.send_json(response_data)
            except Exception as e:
                print(f"WS processing error: {e}")
                await websocket.send_json({"error": "Processing failed"})

    except WebSocketDisconnect:
        print("Websocket disconnected")
    except Exception as e:
        print(f"Websocket error: {e}")


@app.websocket("/ws/listen")
async def websocket_listen(websocket: WebSocket):
    await websocket.accept()
    print("DEBUG: Client connected to /ws/listen")

    try:
        # Define Deepgram callbacks
        loop = asyncio.get_event_loop()

        def on_message(result, **kwargs):
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return

            # print(f"DEBUG: Real-time Transcript: {sentence}")
            # Send live transcript to frontend
            # Send live transcript to frontend
            async def send_transcript():
                try:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        await websocket.send_json(
                            {"type": "transcript", "text": sentence}
                        )
                except Exception:
                    # Ignore connection closed errors as they are expected on disconnect
                    pass

            loop.create_task(send_transcript())

            # 1. Quick Regex Check (Low Latency)
            from memory import extract_name_regex_only

            regex_result = extract_name_regex_only(sentence)

            if regex_result["name"]:
                print(f"DEBUG: Regex detected: {regex_result['name']}")
                loop.create_task(handle_identity(regex_result["name"], websocket))

            # 2. Parallel: Slow Path (High Accuracy with Gemini)
            # Use Gemini for correction logic: "No, it's not Connected, it's Vaidik"
            if len(sentence.split()) > 3:  # Only check longer sentences for context
                loop.create_task(check_gemini_and_handle(sentence, websocket))

        def on_error(error, **kwargs):
            print(f"Deepgram Error: {error}")

        # Connect to Deepgram
        from speech import deepgram

        # Connect using the Async Client Context Manager Pattern
        try:
            # We use deepgram.listen.v1.connect since 'live' attribute is missing on this SDK version
            async with deepgram.listen.v1.connect(
                model="nova-2",
                language="en-US",
                smart_format="true",
                interim_results="false",
            ) as socket:
                socket.on("transcript", on_message)
                socket.on("error", on_error)

                print("DEBUG: Deepgram Live Connection Started via v1.connect")

                while True:
                    data = await websocket.receive_bytes()
                    await socket.send_media(data)

        except AttributeError as e:
            print(f"Deepgram Attribute Error: {e}")
            await websocket.close()
        except Exception as e:
            print(f"WS Listen loop error: {e}")
        # Context manager handles finish()

    except Exception as e:
        print(f"WS Listen setup error: {e}")


async def check_gemini_and_handle(transcript: str, websocket: WebSocket):
    """Background task to check complex sentences with Gemini."""
    try:
        from memory import extract_name_from_transcript

        # Run sync Gemini call in thread pool
        import asyncio

        result = await asyncio.to_thread(extract_name_from_transcript, transcript)

        if result and result.get("name"):
            print(f"DEBUG: Gemini Detected: {result['name']}")
            await handle_identity(result["name"], websocket)
    except Exception as e:
        print(f"Gemini background check failed: {e}")


async def handle_identity(name: str, websocket: WebSocket):
    """
    Decides whether to Register a new face or Rename an existing face
    based on what was most recently seen.
    """
    try:
        from models import add_person, update_person_name, get_all_people
        from recognition import face_cache

        # A. Check for RECENT KNOWN face (Correction scenario)
        # "No my name is Vaidik" -> Updates 'Connected' to 'Vaidik'
        known_id = face_cache.get_last_seen_known(ttl=10)  # 10s window to correct

        if known_id:
            print(f"DEBUG: Renaming person {known_id} to {name}")
            success = await update_person_name(known_id, name)
            if success:
                # Update Cache
                people = await get_all_people()
                face_cache.update(people)

                # Notify UI to force refresh
                await websocket.send_json(
                    {
                        "type": "identity_update",
                        "name": name,
                        "person_id": known_id,
                        "mode": "rename",
                    }
                )
                return

        # B. Check for RECENT UNKNOWN face (New Registration scenario)
        unknown_embedding = face_cache.get_last_unknown(ttl=8)

        if unknown_embedding is not None:
            # Check if embedding is numpy
            import numpy as np

            if isinstance(unknown_embedding, np.ndarray):
                embedding_list = unknown_embedding.tolist()
            else:
                embedding_list = unknown_embedding

            print(f"DEBUG: Registering NEW person {name}...")
            person_id = await add_person(name, embedding_list)

            # Update Cache
            people = await get_all_people()
            face_cache.update(people)

            # Reset last unknown
            face_cache.last_unknown_embedding = None

            await websocket.send_json(
                {
                    "type": "identity_update",
                    "name": name,
                    "person_id": person_id,
                    "mode": "new",
                }
            )
        else:
            print(
                f"DEBUG: Name '{name}' detected, but no recent face (known or unknown) to attach to."
            )

    except Exception as e:
        print(f"Error in handle_identity: {e}")


async def register_and_notify(name: str, embedding, websocket: WebSocket):
    """
    Helper to running async DB operations from the Deepgram callback.
    """
    try:
        from models import add_person, get_all_people
        from recognition import face_cache

        # 1. Add to DB
        # Convert numpy array to list for JSON serialization if needed,
        # but add_person expects list or numpy? models.py usually handles it.
        # Let's clean it up.
        # Check if embedding is numpy
        import numpy as np

        if isinstance(embedding, np.ndarray):
            embedding_list = embedding.tolist()
        else:
            embedding_list = embedding

        print(f"DEBUG: Registering {name}...")
        person_id = await add_person(name, embedding_list)

        # 2. Update Cache
        people = await get_all_people()
        face_cache.update(people)

        # 3. Reset last unknown so we don't register them again immediately
        face_cache.last_unknown_embedding = None

        # 4. Notify Frontend
        await websocket.send_json(
            {"type": "identity_update", "name": name, "person_id": person_id}
        )
        print(f"DEBUG: Sent identity_update for {name}")

    except Exception as e:
        print(f"Error in register_and_notify: {e}")
