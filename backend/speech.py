import os
import httpx

# import json
# import asyncio
from dotenv import load_dotenv
from deepgram import AsyncDeepgramClient

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Initialize Deepgram Client
# Passing api_key as keyword argument to satisfy BaseClient.__init__ signature
deepgram = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)


async def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribes audio using Deepgram API via HTTP requests (Legacy/File based).
    """
    try:
        url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "audio/webm",
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url, headers=headers, content=audio_bytes, timeout=30.0
            )

        if response.status_code != 200:
            print(f"Deepgram API error: {response.text}")
            return ""

        data = response.json()
        transcript = (
            data.get("results", {})
            .get("channels", [])[0]
            .get("alternatives", [])[0]
            .get("transcript", "")
        )
        return transcript

    except Exception as e:
        print(f"Error in Deepgram transcription: {e}")
        return ""
