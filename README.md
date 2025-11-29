# 🚚 AutoDispatch AI - Voice-Enabled Delivery Coordination System

A real-time logistics coordination platform built with Next.js. This application combines an automated dispatch dashboard with a voice AI console, using Groq Whisper API for ultra-fast transcription and DeepSeek R1 for intelligent delivery intent extraction.

## ✨ Features

  - **Automated Dispatch Queue** - Simulates live delivery call workflows with visual status tracking
  - **Voice AI Console** - Dedicated interface for testing speech-to-text and intent extraction
  - **Ultra-Fast Transcription** - Uses Groq Whisper API (Large-v3 model) for near-instant speech recognition
  - **Intelligent Address Parsing** - DeepSeek R1 extracts structured addresses (Street, City, Country) from natural conversation
  - **Dynamic Manifest Updates** - Real-time updates to delivery cards based on voice confirmation
  - **Visual Status Tracking** - Color-coded badges for Pending, Calling, Analyzing, and Confirmed states
  - **Robust Audio Handling** - Advanced safety checks for 0-byte audio blobs and reliable stream cleanup

## 🎯 Example Usage

**1. Auto-Dialer Mode:**
Click "Start Queue" to have the system automatically cycle through pending deliveries, simulating calls and updating statuses.

**2. Manual Call Mode:**
Click "Call Now" on a specific delivery card to initiate the voice AI workflow for that customer.

**3. Test Console:**
Click "Start Recording" in the right-hand panel and say:

> "Yes, this is Harvey. Please drop the package at the side entrance. I'm at House 45, Street 8, Islamabad."

The system will:

1.  Transcribe your speech via Groq
2.  Extract the new address (`House 45, Street 8, Islamabad`)
3.  Identify the delivery instruction (`drop at side entrance`)
4.  Update the manifest card dynamically

## 📋 Prerequisites

  - **Node.js** 18.x or higher
  - **npm** or **yarn**
  - **Groq API Key** (for Whisper transcription & Llama/Mixtral inference)
  - **DeepSeek API Key** (for R1 logic extraction)

## 🚀 Installation

### 1\. Install Dependencies

```bash
npm install
```

This will install:

  - `next` - Framework
  - `react` & `react-dom` - UI Library
  - `axios` - API Requests
  - `lucide-react` - Icons
  - `formidable` - File upload parsing
  - `form-data` - Multipart handling

### 2\. Configure API Keys

Create a `.env.local` file in the project root:

```env
# Groq API Key for Whisper (Audio)
GROQ_API_KEY=gsk_your_groq_key_here

# DeepSeek API credentials for R1 (Logic)
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
```

#### Where to Get API Keys:

**Groq (Whisper API)**

1.  Go to [Groq Console](https://console.groq.com/)
2.  Sign up or log in
3.  Create a new API Key

**DeepSeek (R1 Model)**

1.  Go to [DeepSeek Platform](https://platform.deepseek.com/)
2.  Generate a new API Key

### 3\. Run Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

## 📁 Project Structure

```
autodispatch/
├── pages/
│   ├── index.js              # Main Dashboard UI with Dispatch Logic
│   └── api/
│       ├── transcribe.js     # Groq Whisper API route (audio → text)
│       ├── interpret.js      # DeepSeek R1 route (text → JSON)
│       └── book.js           # Confirmation logic route
├── styles/
│   └── Home.module.css       # Custom animations and layout styles
├── .env.local                # API secrets (ignored by git)
├── package.json              # Project dependencies
└── README.md                 # Documentation
```

## 🔧 API Routes Explained

### `/api/transcribe.js`

**Purpose:** Converts webm audio blobs to text using Groq's Whisper Large-v3 model.

**Process:**

1.  Receives audio blob via `multipart/form-data`
2.  Uses `formidable` to parse the file upload
3.  Streams file to Groq API endpoint
4.  Returns high-accuracy transcription

**Key Features:**

  - **Zero-Byte Check**: Prevents API errors by validating file size before upload
  - **Cleanup**: Automatically deletes temporary files after processing

### `/api/interpret.js`

**Purpose:** Extracts structured delivery data using DeepSeek R1.

**Process:**

1.  Receives raw transcription text
2.  Injects system prompt defining JSON schema (Street, City, Time, Notes)
3.  Calls DeepSeek R1 via OpenAI-compatible endpoint
4.  Sanitizes Markdown code blocks from response

**Extracted Fields:**

  - `houseNumber` - Extracted house/unit number
  - `street` - Street name/number
  - `city` - City name
  - `country` - Country name
  - `time` - Confirmed delivery time slot
  - `intent` - available / reschedule / unavailable

### `/api/book.js`

**Purpose:** Finalizes the delivery update.

**Process:**

1.  Receives extracted JSON data
2.  Normalizes address format
3.  Returns confirmation object used to update the UI state

## 🎨 Frontend Architecture

The React interface (`pages/index.js`) is built with:

  - **State Management** - Complex logic for tracking call states (`pending` → `calling` → `analyzing` → `confirmed`)
  - **MediaRecorder API** - Handles browser microphone access and data chunking
  - **Dynamic List Rendering** - Cards update in real-time without page reloads
  - **Tailwind CSS** - Responsive grid layout and status badging

## 🐛 Troubleshooting

### "File size should be greater than 0" Error

**Problem:** The backend rejects the audio file.

**Cause:** The `MediaRecorder` stop event fired before data chunks were collected.

**Solution:**
Ensure your frontend `ondataavailable` handler is correctly pushing chunks to the ref array *before* the blob is created in `onstop`. (This fix is included in the latest version).

### JSON Parsing Error

**Problem:** `Unexpected token` in extraction response.

**Cause:** The LLM returned Markdown code blocks (` json ...  `).

**Solution:**
The backend `interpret.js` includes regex logic to strip markdown formatting before `JSON.parse()`.

### Microphone Not Working

**Solution:**

1.  Ensure you are using `localhost` or `HTTPS`
2.  Check browser permissions icon in the URL bar
3.  Verify no other app is claiming exclusive control of the mic

## 📊 Current Capabilities (Phase 1)

✅ **Live Audio Capture** - Robust webm recording
✅ **Smart Address Parsing** - Separates complex addresses into components
✅ **Intent Recognition** - Distinguishes between confirmation and rescheduling
✅ **Visual Feedback** - Real-time UI updates based on AI results

## 🚀 Future Roadmap (Phase 2)

  - **Text-to-Speech (TTS)** - ElevenLabs integration for the AI to speak back to the driver
  - **Map Integration** - Plot confirmed coordinates on a map using Google Maps API
  - **Twilio Integration** - Make actual phone calls instead of browser simulation
  - **Database Persistence** - Save delivery records to PostgreSQL/Supabase

## 🧪 Testing Guide

1.  **Start the App:** `npm run dev`
2.  **Select a Card:** Click "Call Now" on the "Harvey Specter" card.
3.  **Speak:** "Yeah, I'm at 123 Main Street, New York. You can come at 5 PM."
4.  **Observe:**
      - Status changes to `Analyzing...`
      - Address updates to `123 Main Street, New York`
      - Time updates to `17:00`
      - Status changes to `Confirmed` (Green)

## 📄 License

MIT License - Open for modification and commercial use.

