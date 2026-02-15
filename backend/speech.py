import os
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
deepgram = DeepgramClient(api_key=DEEPGRAM_API_KEY)


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribes audio using Deepgram API."""
    try:
        options = {
            "model": "nova-2",
            "smart_format": True,
        }
        source = {"buffer": audio_bytes}
        response = deepgram.listen.prerecorded.v("1").transcribe_file(source, options)

        transcript = response.results.channels[0].alternatives[0].transcript
        return transcript
    except Exception as e:
        print(f"Error in Deepgram transcription: {e}")
        return ""
