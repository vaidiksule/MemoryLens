import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")


def summarize_conversation(transcript: str) -> dict:
    """Uses Gemini to summarize a conversation transcript into structured JSON."""
    prompt = f"""
    You are a memory compression engine for MemoryLens.
    Given a conversation transcript, return structured JSON:
    {{
        "summary": "1 sentence concise memory of the interaction",
        "key_topics": ["topic1", "topic2"],
        "emotional_tone": "Positive/Neutral/Negative",
        "follow_up_suggestion": "Short suggestion",
        "extracted_name": "Name of the person mentioned if they introduced themselves, else null"
    }}
    Rules:
    - If someone says "I am Alex" or "My name is Sarah", capture "Alex" or "Sarah" in "extracted_name".
    - If no name is clearly stated by the person, set "extracted_name" to null.
    - Keep the summary factual and concise.
    
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
        error_msg = str(e)
        print(f"Error in Gemini summarization: {error_msg}")
        if "403" in error_msg or "leaked" in error_msg.lower():
            summary_text = (
                "API Key Error: Key is invalid or leaked. Please update GOOGLE_API_KEY."
            )
        elif "404" in error_msg:
            summary_text = "Model Error: Selected Gemini model not found."
        else:
            summary_text = f"Summarization failed: {error_msg[:50]}..."

        return {
            "summary": summary_text,
            "key_topics": [],
            "emotional_tone": "Neutral",
            "follow_up_suggestion": "",
            "extracted_name": None,
        }


def extract_name_regex_only(transcript: str) -> dict:
    """
    Fast regex-based name extraction.
    Matches: "My name is X", "I am X", "I'm X", "It's me X"
    """
    pattern = r"(?i)(?:my name is|i am|i'm|it's me)\s+([a-zA-Z]+)"
    match = re.search(pattern, transcript)
    if match:
        name = match.group(1)
        # Filter out common false positives
        common_words = {
            "a",
            "an",
            "the",
            "this",
            "that",
            "these",
            "those",
            "sorry",
            "good",
            "happy",
            "sad",
            "angry",
            "upset",
            "fine",
            "ok",
            "okay",
            "here",
            "there",
            "where",
            "ready",
            "done",
            "finished",
            "recording",
            "thinking",
            "listening",
            "waiting",
            "loading",
            "connected",
            "disconnected",
            "using",
            "trying",
            "testing",
            "going",
            "coming",
            "leaving",
            "staying",
            "talking",
            "speaking",
            "telling",
            "asking",
            "saying",
            "not",
            "just",
            "only",
            "now",
            "then",
            "very",
            "really",
        }

        if name.lower() not in common_words:
            return {"name": name.capitalize()}
    return {"name": None}


def extract_name_from_transcript(transcript: str) -> dict:
    """Specialized prompt including regex fallback for name detection."""

    # 1. Try Regex first for speed and determinism
    regex_result = extract_name_regex_only(transcript)

    # Common Speech-to-Text corrections
    # Common Speech-to-Text corrections
    name_corrections = {
        "veic": "Vaidik",
        "vedic": "Vaidik",  # User prefers Vaidik
        "vedik": "Vaidik",
        "vedic solei": "Vaidik Sule",
        "sydney": "Siddhi",
        "sidney": "Siddhi",
        "sidi": "Siddhi",
        "siddhi": "Siddhi",
        "cd": "Siddhi",  # Sometimes heard as C.D.
        "solei": "Sule",
    }

    if regex_result["name"]:
        extracted = regex_result["name"]
        # rudimentary correction
        if extracted.lower() in name_corrections:
            extracted = name_corrections[extracted.lower()]

        print(f"DEBUG: Regex extracted name: {extracted}")
        return {"name": extracted}

    # 2. Fallback to Gemini
    prompt = f"""
    Analyze this transcript and extract the speaker's name if they are introducing themselves.
    Common patterns: "It's me [Name]", "I am [Name]", "My name is [Name]", "I'm [Name]".
    
    Transcript: "{transcript}"
    
    Return ONLY a JSON object: {{"name": "ExtractedName" or null}}
    """
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)
        if result.get("name"):
            name = result["name"]
            # rudimentary correction
            name_corrections = {
                "veic": "Vaidik",
                "vedic": "Vaidik",  # User prefers Vaidik
                "vedik": "Vaidik",
                "vedic solei": "Vaidik Sule",
                "sydney": "Siddhi",
                "sidney": "Siddhi",
                "sidi": "Siddhi",
                "siddhi": "Siddhi",
                "cd": "Siddhi",
                "solei": "Sule",
            }
            if name.lower() in name_corrections:
                result["name"] = name_corrections[name.lower()]
        return result
    except Exception as e:
        print(f"Error extracting name with Gemini: {e}")
        return {"name": None}
