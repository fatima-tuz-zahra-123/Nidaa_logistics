# 🎤 Speech-to-Appointment Booking System

A real-time speech-to-appointment booking system built with Next.js. This application uses browser-based audio recording, OpenAI Whisper API for transcription, and DeepSeek R1 for intelligent appointment data extraction with natural language understanding.

## ✨ Features

- **Browser Audio Recording** - Capture speech directly in the browser using MediaRecorder API
- **Real-time Transcription** - Convert speech to text using OpenAI Whisper API
- **Intelligent Extraction** - DeepSeek R1 extracts structured appointment data from natural language
- **Relative Date Parsing** - Understands phrases like "tomorrow", "next Tuesday", "in 3 days"
- **Filler Word Filtering** - Automatically ignores "um", "uh", and other filler words
- **Mock Booking System** - Simulates appointment booking with confirmation
- **Confidence Scoring** - Provides confidence levels for extracted information

## 🎯 Example Usage

Simply click "Start Recording" and say:

> "I want to book an appointment with Dr. Smith for next Tuesday at 2 PM"

> "Schedule me with a cardiologist tomorrow morning at 10"

> "Book Dr. Johnson for Friday afternoon around 3:30"

The system will:
1. Transcribe your speech
2. Extract appointment details (doctor, specialty, date, time)
3. Convert relative dates to absolute dates
4. Create a mock booking confirmation

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **OpenAI API Key** (for Whisper transcription)
- **DeepSeek API Key** (for R1 model)

## 🚀 Installation

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `next` - Next.js framework
- `react` & `react-dom` - React library
- `axios` - HTTP client
- `form-data` - Multipart form data handling
- `multer` - File upload middleware

### 2. Configure API Keys

Edit `.env.local` in the project root:

```env
# OpenAI API Key for Whisper transcription
OPENAI_API_KEY=sk-your-openai-key-here

# DeepSeek API credentials for R1 model
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
```

#### Where to Get API Keys:

**OpenAI (Whisper API)**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

**DeepSeek (R1 Model)**
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account
3. Navigate to API Keys
4. Generate a new API key
5. Copy the key

### 3. Run Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
booking/
├── pages/
│   ├── index.js              # Main React UI with recording interface
│   └── api/
│       ├── transcribe.js     # Whisper API route (audio → text)
│       ├── interpret.js      # DeepSeek R1 route (text → JSON)
│       └── book.js           # Mock booking route (JSON → confirmation)
├── styles/
│   └── Home.module.css       # Component styles
├── .env.local                # API keys (not committed to git)
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🔧 API Routes Explained

### `/api/transcribe.js`

**Purpose:** Converts audio to text using OpenAI Whisper

**Process:**
1. Accepts webm audio file via multipart/form-data
2. Uses multer middleware to handle file upload
3. Forwards audio to OpenAI Whisper API
4. Returns transcribed text

**Key Features:**
- Handles up to 25MB audio files
- Supports webm format (browser default)
- In-memory processing (no disk writes)

### `/api/interpret.js`

**Purpose:** Extracts structured appointment data from transcription

**Process:**
1. Receives transcription text
2. Injects current date context (e.g., "Today is 2025-11-15")
3. Calls DeepSeek R1 using OpenAI-compatible endpoint
4. Returns structured JSON

**Extracted Fields:**
- `doctor` - Doctor's name (string or null)
- `speciality` - Medical specialty (string or null)
- `date` - Appointment date in YYYY-MM-DD format
- `time` - Appointment time in HH:MM format
- `intent` - User intent (book/reschedule/cancel/inquiry)
- `confidence` - Confidence score (0.0 to 1.0)

**Date Parsing Examples:**
- "tomorrow" → 2025-11-16
- "next Tuesday" → 2025-11-19
- "in 3 days" → 2025-11-18

### `/api/book.js`

**Purpose:** Mock appointment booking endpoint

**Process:**
1. Receives extracted appointment JSON
2. Generates unique booking ID
3. Logs appointment details to console
4. Returns mock confirmation

**Future Enhancements:**
- Database integration
- Doctor availability checking
- Email/SMS notifications
- Calendar integration

## 🎨 Frontend Features

The React interface (`pages/index.js`) provides:

- **Start/Stop Recording Buttons** - Control audio capture
- **Recording Indicator** - Visual feedback with animated pulse
- **Transcription Display** - Shows Whisper output in real-time
- **Extracted Data Preview** - JSON display of parsed appointment details
- **Booking Confirmation** - Success message with appointment summary
- **Error Handling** - User-friendly error messages

## 🐛 Troubleshooting

### Microphone Access Denied

**Problem:** Browser blocks microphone access

**Solution:**
1. Check browser permissions (usually in address bar)
2. Allow microphone access for localhost
3. Use HTTPS in production (required for microphone access)

### Whisper API Errors

**Problem:** Transcription fails

**Possible Causes:**
- Invalid or expired OpenAI API key
- Audio format not supported (rare with webm)
- Audio file too large (>25MB)
- No audio recorded

**Solution:**
1. Verify `OPENAI_API_KEY` in `.env.local`
2. Check console logs for detailed error messages
3. Try shorter recordings

### DeepSeek API Errors

**Problem:** Interpretation fails

**Possible Causes:**
- Invalid DeepSeek API key
- API rate limiting
- Model availability issues

**Solution:**
1. Verify `DEEPSEEK_API_KEY` in `.env.local`
2. Check DeepSeek API status
3. Review console logs for error details

### Audio Format Issues

**Problem:** Whisper rejects audio file

**Current Solution:** The system sends webm directly to Whisper (natively supported)

**Future Enhancement:** Add server-side ffmpeg conversion if needed

## 🔒 Security Notes

- **Never commit `.env.local`** - Contains sensitive API keys
- **API Key Rotation** - Regularly rotate your API keys
- **Rate Limiting** - Implement rate limiting in production
- **Input Validation** - Current implementation has basic validation
- **HTTPS Required** - Use HTTPS in production for microphone access

## 📊 Current Limitations (Phase 1)

This is Phase 1 - a functional prototype with:

✅ Browser-based recording  
✅ Whisper transcription  
✅ DeepSeek R1 extraction  
✅ Mock booking system  

❌ No database integration  
❌ No doctor availability checking  
❌ No user authentication  
❌ No email/SMS notifications  
❌ No appointment management UI  

## 🚀 Future Enhancements (Phase 2)

- **Database Integration** - PostgreSQL/MongoDB for persistent storage
- **Doctor Management** - CRUD for doctor profiles and availability
- **Real-time Availability** - Check actual appointment slots
- **User Authentication** - Patient login and profile management
- **Notification System** - Email/SMS confirmation and reminders
- **Calendar Integration** - Google Calendar, Outlook sync
- **Admin Dashboard** - Manage appointments, doctors, patients
- **Multi-language Support** - Support languages beyond English
- **Voice Feedback** - Text-to-speech confirmation

## 🧪 Testing

### Manual Testing

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   Navigate to http://localhost:3000

3. **Test recording:**
   - Click "Start Recording"
   - Say: "I want to book Dr. Smith for tomorrow at 2 PM"
   - Click "Stop Recording"
   - Observe transcription, extraction, and booking results

4. **Check console logs:**
   - View terminal for API route logs
   - See detailed appointment booking information

### Test Phrases

Try these example phrases:

```
"Book an appointment with Dr. Johnson next Tuesday at 10 AM"
"I need to see a cardiologist tomorrow afternoon around 3"
"Schedule Dr. Williams for Friday morning at 9:30"
"Can I get an appointment with Dr. Brown next week on Wednesday at 2 PM"
"I want to see a dermatologist the day after tomorrow at 11"
```

## 📝 Development Notes

### Whisper API Handling

- Audio is sent as multipart/form-data
- Multer processes the upload in memory
- No temporary files are created
- Supports webm format natively

### DeepSeek R1 Integration

- Uses OpenAI-compatible endpoint format
- System prompt includes date context
- Temperature set to 0.3 for deterministic extraction
- Handles markdown code blocks in responses
- Fallback JSON parsing for robustness

### Date Injection Strategy

Current date is calculated on the backend and injected into the DeepSeek prompt:

```javascript
const today = new Date();
const formattedDate = today.toISOString().split('T')[0];
```

This ensures accurate relative date parsing regardless of client timezone.

## 🤝 Contributing

This is a Phase 1 prototype. Future contributions should focus on:

1. Database integration
2. Real appointment management
3. User authentication
4. Enhanced error handling
5. Unit and integration tests

## 📄 License

MIT License - feel free to use and modify for your projects.

---

**Built with:**
- Next.js 14+
- OpenAI Whisper API
- DeepSeek R1 API
- MediaRecorder API
- React Hooks

**Status:** Phase 1 Complete ✅
