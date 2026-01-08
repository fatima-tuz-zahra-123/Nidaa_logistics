# Robot Voice Call Flow Example

## Scenario: Calling Customer "John Smith" for Delivery Confirmation

---

### 📞 Call Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  USER ACTION: Clicks "Call Now" on John Smith's delivery   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Status → "Calling"                                 │
│  UI: Blue pulse indicator appears                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  🤖 ROBOT SPEAKS (TTS Activated):                           │
│                                                              │
│  "Hello John Smith, this is AutoDispatch AI calling about   │
│   your delivery. I need to confirm your delivery details.   │
│   Could you please provide your complete address including  │
│   house number, street name, city, and your preferred       │
│   delivery time?"                                            │
│                                                              │
│  Duration: ~8-10 seconds                                    │
│  UI: "Speaking..." indicator with spinning loader           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Waits 500ms pause                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Starts Recording                                   │
│  UI: Red pulse "Recording..." indicator                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  👤 CUSTOMER RESPONDS:                                       │
│                                                              │
│  "Yes, my address is 123 Main Street, Springfield, and     │
│   I'd like the delivery tomorrow at 3 PM"                   │
│                                                              │
│  Duration: 5-15 seconds (customer decides when to stop)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  USER/AUTO: Clicks "End Call" or auto-stop after silence   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Status → "Analyzing"                               │
│  UI: Purple "Extracting..." with loader                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND PROCESSING:                                        │
│  1. Transcribe audio (Groq Whisper)                        │
│  2. Extract entities (Groq LLaMA)                          │
│  3. Update database with:                                   │
│     - House number: 123                                     │
│     - Street: Main Street                                   │
│     - City: Springfield                                     │
│     - Delivery time: tomorrow at 3 PM                       │
│     - Generate Google Maps link                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SYSTEM: Status → "Confirmed"                               │
│  UI: Green badge "Ready"                                    │
│  Display: "Slot: tomorrow at 3 PM"                          │
│  Link: Google Maps to 123 Main Street, Springfield         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎭 Example Dialogue Variations

### Example 1: Formal Voice (Onyx)
```
🤖 Robot (Deep, Authoritative):
"Hello Sarah Johnson, this is AutoDispatch AI calling about your 
delivery. I need to confirm your delivery details. Could you please 
provide your complete address including house number, street name, 
city, and your preferred delivery time?"

👤 Customer:
"Hi, it's 456 Oak Avenue, Riverside. Anytime tomorrow is fine."

✅ Confirmed → 456 Oak Avenue, Riverside | Tomorrow (ASAP)
```

### Example 2: Friendly Voice (Nova - Fast Speed)
```
🤖 Robot (Energetic, 1.25x speed):
"Hello Mike Davis, this is AutoDispatch AI calling about your 
delivery! I need to confirm your delivery details. Could you please 
provide your complete address including house number, street name, 
city, and your preferred delivery time?"

👤 Customer:
"Yeah sure, 789 Elm Street, Lakewood. Can you come around 5 PM?"

✅ Confirmed → 789 Elm Street, Lakewood | Today at 5 PM
```

### Example 3: Calm Voice (Shimmer - Slow Speed)
```
🤖 Robot (Soft, 0.75x speed):
"Hello Emily Chen, this is AutoDispatch AI calling about your 
delivery. I need to confirm your delivery details. Could you please 
provide your complete address including house number, street name, 
city, and your preferred delivery time?"

👤 Customer:
"My address is 321 Pine Boulevard, apartment 4B, Greenville. 
I prefer morning deliveries, around 10 AM."

✅ Confirmed → 321 Pine Boulevard, 4B, Greenville | Tomorrow at 10 AM
```

---

## 🎨 UI Indicators

### Voice Settings Panel (Top of Page)
```
┌────────────────────────────────────────────────────────────┐
│  🤖 Robot Voice Settings                                   │
│  Configure AI greeting voice                               │
│                                                             │
│  [✓] Enable Voice   Speed: [1.0x ▼]   Voice: [Alloy ▼]   │
│                                                             │
│  Status: [🔄 Speaking...] ← Shows when robot is talking   │
└────────────────────────────────────────────────────────────┘
```

### During Call States

**1. Robot Speaking:**
```
Status: [🔵 Dialing...] + [🔄 Speaking...]
Button: [Disabled - Robot is speaking]
```

**2. Recording Customer:**
```
Status: [🔴 Recording...]
Button: [⏸ End Call]
Console: "On Call: [Delivery ID]"
```

**3. Processing:**
```
Status: [🟣 Extracting...]
Button: [Disabled]
Console: "Processing..." with spinner
```

**4. Complete:**
```
Status: [🟢 Ready]
Badge: "Slot: 3 PM tomorrow"
Link: [📍 Google Maps]
```

---

## 🧪 Testing Scenarios

### Test 1: Basic Happy Path
1. Enable voice (check box ON)
2. Set speed to 1.0x
3. Select "Alloy" voice
4. Click "Call Now" on any delivery
5. **Listen** to robot greeting
6. **Wait** for "Recording..." indicator
7. **Speak** your address and time
8. Click "End Call"
9. **Verify** confirmation with extracted data

### Test 2: Voice Disabled
1. **Uncheck** "Enable Voice"
2. Click "Call Now"
3. **Expected**: No robot speech, recording starts immediately
4. Should still work normally

### Test 3: Different Voices
1. Try each voice (Alloy, Echo, Fable, Onyx, Nova, Shimmer)
2. Notice different tones and characteristics
3. Choose your favorite!

### Test 4: Speed Variations
1. Set speed to 0.75x → Robot speaks slowly
2. Set speed to 1.5x → Robot speaks quickly
3. Adjust based on customer needs

### Test 5: Interrupt Test
1. Start a call
2. While robot is speaking, try clicking "End Call"
3. **Expected**: Robot stops, call ends gracefully

---

## 📊 Metrics You Can Track

- Average time robot speaks: ~8-10 seconds
- Time customer speaks: ~5-15 seconds
- Total call duration: ~15-30 seconds
- Success rate: Based on "Confirmed" vs "Unavailable"
- Voice preference: Which voice gets best results?
- Speed preference: Optimal speed for comprehension?

---

## 🔧 Customization Options

### Change Greeting Text
Edit line ~350 in `pages/index.js`:
```javascript
const greeting = `Hello ${customerName}, [YOUR CUSTOM MESSAGE]`;
```

### Add Conditional Greetings
```javascript
// Example: Different greetings based on time of day
const hour = new Date().getHours();
const timeGreeting = hour < 12 ? 'Good morning' : 
                     hour < 18 ? 'Good afternoon' : 'Good evening';

const greeting = `${timeGreeting} ${customerName}, this is AutoDispatch AI...`;
```

### Add Language Detection
```javascript
// Example: Greeting in customer's language
const language = delivery?.preferred_language || 'en';
const greetings = {
  en: `Hello ${customerName}, this is AutoDispatch AI...`,
  es: `Hola ${customerName}, soy AutoDispatch AI...`,
  fr: `Bonjour ${customerName}, c'est AutoDispatch AI...`
};
const greeting = greetings[language] || greetings.en;
```

---

**The robot voice makes your call system feel professional and guides customers through the process! 🤖✨**
