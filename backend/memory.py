import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")


def summarize_conversation(transcript: str) -> dict:
    """Uses Gemini to summarize a conversation transcript into structured JSON."""
    prompt = f"""
    You are a memory compression engine for MemoryLens.
    Given a conversation transcript, return structured JSON:
    {{
        "summary": "1 sentence concise memory",
        "key_topics": ["topic1", "topic2", "topic3"],
        "emotional_tone": "Positive/Neutral/Negative",
        "follow_up_suggestion": "Short suggestion"
    }}
    Keep it factual. No speculation. No fabrication.
    
    Transcript:
    {transcript}
    
    Return valid JSON only.
    """

    try:
        response = model.generate_content(prompt)
        # Clean up the response to extract JSON
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)
    except Exception as e:
        print(f"Error in Gemini summarization: {e}")
        return {
            {
                "summary": "Conversation recorded but could not be summarized.",
                "key_topics": [],
                "emotional_tone": "Neutral",
                "follow_up_suggestion": "",
            }
        }
