# ✨ MemoryLens - Augmented Social Memory

> **"Never forget a face, a name, or a conversation again."**
> MemoryLens is an AI-powered augmented reality interface that enhances your social interactions in real-time.

---

## 🚀 Overview

MemoryLens acts as a "second brain" for your social life. By combining **real-time facial recognition**, **instant speech transcription**, and **generative AI analysis**, it creates a live, searchable database of everyone you meet.

When you see someone, MemoryLens instantly:
1.  **Identifies** them (or learns their name automatically if you’re meeting for the first time).
2.  **Recalls** past conversations, topics discussed, and emotional context.
3.  **Transcribes** the current conversation live with ultra-low latency.
4.  **Summarizes** key points and stores them for future reference.

It’s like having a superpower for social context—running locally on your machine with a beautiful, futuristic interface.

---

## 💎 Key Features

- **👀 Real-Time Face Recognition:** Powered by **InsightFace** for high-accuracy, low-latency detection and tracking.
- **🗣️ Live Transcription:** Uses **Deepgram Nova-2** for lightning-fast speech-to-text conversion via WebSocket.
- **🧠 Frontier AI Intelligence:** Integrated with **Google Gemini Pro** to summarize conversations, extract names, identify topics, and analyze sentiment.
- **🔄 Auto-Registration & Correction:**
    - **Smart Learning:** If you say "Hi, I'm Vaidik", the system automatically registers the unknown face with that name.
    - **Correction:** If the system gets it wrong, saying "No, it's John" will correct the identity of the person you are looking at.
- **💾 Social Context DB:** A persistent **MongoDB** database that stores every interaction, searchable by person or topic.
- **🎨 Futuristic UI:** A stunning, responsive interface built with **Next.js 14**, **Tailwind CSS**, and **Shadcn UI**, featuring glassmorphism and smooth animations.
- **🔒 Privacy-Focused:** Face embeddings are generated locally. No images are sent to third-party recognition APIs.

---

## 🛠️ Technology Stack

### Frontend (Client)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS, Shadcn UI
- **Real-time:** WebSockets (`ws://`) for video and audio streaming
- **Media:** React Webcam, MediaRecorder API
- **Icons:** Lucide React

### Backend (Server)
- **Framework:** FastAPI (Python)
- **Computer Vision:** OpenCV, InsightFace (Buffalo_L model), ONNX Runtime
- **AI Models:**
    - **Google Gemini Pro** (Context & Summary)
    - **Deepgram Nova-2** (Real-time Speech-to-Text)
- **Database:** MongoDB (Motor Async Driver)
- **Concurrency:** Asyncio for non-blocking WebSocket handling

---

## 📸 How It Works (The Core Loop)

MemoryLens operates on a sophisticated "Listen-See-Remember" loop:

### 1. The Visual Loop
- **Capture**: The frontend streams webcam frames to the backend via WebSocket (`/ws/recognition`).
- **Detect**: The backend uses **InsightFace** to detect faces and generate embeddings.
- **Identify**: It compares the embedding against a cached list of known people.
- **Feedback**: The UI immediately draws a bounding box. If the person is known, it displays their name, last meeting date, and a summary of your last conversation.

### 2. The Audio Loop
- **Listen**: Audio is streamed in real-time to **Deepgram** via a second WebSocket (`/ws/listen`).
- **Transcribe**: As you speak, text appears instantly on the screen.
- ** Analyze**: The transcript is constantly analyzed for intent:
    - *Auto-Registration*: "My name is [Name]" triggers a new profile creation for an unknown face.
    - *Correction*: "No, this is [Name]" renames the currently visible person.

### 3. Storing Memories
- **End Session**: When you click "End Session" (or after a period of silence), the full conversation transcript is sent to **Gemini**.
- **Summarize**: Gemini generates a structured summary (Topics, Mood, Key Details).
- **Save**: This memory is stored in MongoDB, linked to the identified person.

---

## ⚡ Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Database (Local or Atlas)
- API Keys for:
  - **Google Gemini** (Vertex AI / AI Studio)
  - **Deepgram** (Speech-to-Text)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/MemoryLens.git
cd MemoryLens
```

### 2. Backend Setup
Navigate to the backend directory and set up the Python environment.

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/` with your credentials:
```env
MONGODB_URI=mongodb+srv://<your_mongo_string>
GOOGLE_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend directory.

```bash
cd frontend
npm install
```

Run the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to launch the MemoryLens interface!

---

## � Troubleshooting "Unknown" Faces

If the system marks someone as "Unknown" or fails to register them:

1.  **Lighting**: Ensure the face is well-lit. Shadows can change face embeddings.
2.  **Angle**: Look directly at the camera for the initial registration.
3.  **Audio Clarity**: Speak clearly when introducing yourself ("I am [Name]"). The Regex/AI needs to hear the name distinctively.
4.  **Distance**: Being too far from the camera (small face resolution) significantly reduces accuracy.

---

## 🔮 Future Roadmap

- [ ] Multi-person conversation separation (diarization).
- [ ] Mobile app integration via React Native.
- [ ] Local LLM support (Llama 3) for offline analysis.
- [ ] Calendar integration for "last met" context.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ by Vaidik Sule*
