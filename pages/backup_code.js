import React, { useState, useEffect, useRef } from 'react';
// import Head from "next/head";
import axios from 'axios';
import styles from "../styles/Home.module.css";
import { 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Play, 
  Pause, 
  Smartphone, 
  User,
  MessageSquare,
  Activity
} from 'lucide-react';

// Mock Data for initial state
const INITIAL_DELIVERIES = [
  // { id: 1, name: "Sarah Jenkins", phone: "+1 (555) 012-3456", address: "123 Maple Ave, Springfield", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  // { id: 2, name: "Mike Ross", phone: "+1 (555) 019-8765", address: "4500 Lincoln Blvd, Apt 4B", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  // { id: 3, name: "Jessica Pearson", phone: "+1 (555) 011-2233", address: "880 Highland Park", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  // { id: 4, name: "Louis Litt", phone: "+1 (555) 017-5544", address: "Queens Rd, Block C", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  { id: 5, name: "Harvey Specter", phone: "+1 (555) 015-9988", address: "Penthouse 3, Central Twr", status: "pending", confirmedTime: null, notes: "", transcript: [] },
];

// Simple Card Component
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    pending: "bg-gray-100 text-gray-600 border-gray-200",
    calling: "bg-blue-50 text-blue-600 border-blue-200 animate-pulse",
    analyzing: "bg-purple-50 text-purple-600 border-purple-200",
    confirmed: "bg-green-50 text-green-600 border-green-200",
    unavailable: "bg-red-50 text-red-600 border-red-200",
  };

  const labels = {
    pending: "Queued",
    calling: "Dialing...",
    analyzing: "Extracting Data...",
    confirmed: "Ready for Delivery",
    unavailable: "Reschedule Needed",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending} flex items-center gap-2 w-fit`}>
      {status === 'calling' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'confirmed' && <CheckCircle className="w-3 h-3" />}
      {status === 'unavailable' && <XCircle className="w-3 h-3" />}
      {labels[status] || status}
    </span>
  );
};

export default function App() {
  const [deliveries, setDeliveries] = useState(INITIAL_DELIVERIES);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isAutoDialerOn, setIsAutoDialerOn] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const scrollRef = useRef(null);

  // FIX: Ensure Tailwind is fully loaded BEFORE rendering the app
  useEffect(() => {
    // If tailwind object already exists, we are good to go
    if (window.tailwind) {
      const timer = setTimeout(() => setIsStyleLoaded(true));
      return () => clearTimeout(timer);
    }

    const scriptId = 'tailwind-cdn';
    let script = document.getElementById(scriptId);

    if (script) {
      // If script exists but window.tailwind is missing, we poll for it
      const checkInterval = setInterval(() => {
        if (window.tailwind) {
          setIsStyleLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    } else {
      // Inject script and wait for onload
      script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      
      script.onload = () => {
        // Small delay to allow Tailwind to parse the DOM once
        setTimeout(() => setIsStyleLoaded(true), 100);
      };
      
      document.head.appendChild(script);
    }
  }, []);

  // --- SIMULATION LOGIC STARTS HERE ---
  
  const simulateCallProcess = async (deliveryId) => {
    setActiveCallId(deliveryId);
    updateStatus(deliveryId, 'calling');

    // Step 1: Simulate Ringing
    await new Promise(r => setTimeout(r, 1500));

    // Step 2: Simulate Conversation (Where STT/TTS happens)
    // We mock the transcript updates here
    const mockConversation = [
      { role: 'bot', text: "Hello, this is Swift Delivery. We have a package for you today. Are you available?" },
      { role: 'user', text: "Hi! Yes, I am home." },
      { role: 'bot', text: "Great. Can we confirm your location? Is 123 Maple Ave correct?" },
      { role: 'user', text: "Yes, but please leave it at the side door. I'll be there around 2 PM." },
      { role: 'bot', text: "Understood. Side door, 2 PM. Have a great day!" },
    ];

    updateStatus(deliveryId, 'calling'); // Keep status calling/active

    // // Play out the transcript with delays
    // let currentTranscript = [];
    // for (const msg of mockConversation) {
    //   await new Promise(r => setTimeout(r, 1200)); // Delay between messages
    //   currentTranscript.push(msg);
    //   updateTranscript(deliveryId, currentTranscript);
    // }

    // Step 3: Analyzing/Extracting Data
    updateStatus(deliveryId, 'analyzing');
    await new Promise(r => setTimeout(r, 1000));

    // Step 4: Finalize
    // This simulates the logic where your AI extracts "2 PM" and "Side door"
    const getRandomSuccess = () => Math.random() > 0.2; // 80% success rate for demo
    
    const success = getRandomSuccess();
    
    if (success) {
      setDeliveries(prev => prev.map(d => {
        if (d.id === deliveryId) {
          return {
            ...d,
            status: 'confirmed',
            confirmedTime: "14:00", // Mock extracted time
            notes: "Leave at side door" // Mock extracted note
          };
        }
        return d;
      }));
    } else {
      updateStatus(deliveryId, 'unavailable');
    }

    setActiveCallId(null);
  };

  // --- END SIMULATION LOGIC ---

  const updateStatus = (id, status) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const updateTranscript = (id, transcript) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, transcript } : d));
  };

  const handleManualCall = (id) => {
    if (activeCallId) return; // Prevent multiple simultaneous calls for this demo
    simulateCallProcess(id);
  };

  // Auto-dialer effect
  useEffect(() => {
    if (isAutoDialerOn && !activeCallId) {
      const nextPending = deliveries.find(d => d.status === 'pending');
      
      if (nextPending) {
        // Schedule next call
        const timer = setTimeout(() => {
          simulateCallProcess(nextPending.id);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // Queue empty - Turn off auto dialer
        const timer = setTimeout(() => {
          setIsAutoDialerOn(false);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isAutoDialerOn, activeCallId, deliveries]);

  // Scroll to bottom of transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [deliveries]);

  // Statistics
  const stats = {
    total: deliveries.length,
    confirmed: deliveries.filter(d => d.status === 'confirmed').length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    failed: deliveries.filter(d => d.status === 'unavailable').length,
  };
  const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState('');
    const [extractedData, setExtractedData] = useState(null);
    const [bookingResult, setBookingResult] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
  
    // Request microphone permissions on component mount
    useEffect(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => console.log('Microphone access granted'))
          .catch((err) => {
            setError('Microphone access denied. Please enable microphone permissions.');
            console.error('Microphone error:', err);
          });
      }
    }, []);
    const startLiveCall = async (deliveryId) => {
    // --- 1. UI Initialization (From simulateCallProcess) ---
      try {
        setError(null);
        setTranscription('');
        setExtractedData(null);
        setBookingResult(null);

        // Set the active card and visual status
        setActiveCallId(deliveryId);
        updateStatus(deliveryId, 'calling'); 

        // --- 2. Recording Setup (From startRecording) ---
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const options = { mimeType: 'audio/webm' };
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        audioChunksRef.current = [];

        // Collect audio data
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        // --- 3. Processing Logic (Merged Logic) ---
        mediaRecorderRef.current.onstop = async () => {
          // A. Prepare Audio
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // B. Update UI to "Analyzing" state (From simulateCallProcess)
          updateStatus(deliveryId, 'analyzing');

          try {
            // C. Process Audio (Real API Call)
            // We assume processAudio returns the object: { text: "...", extracted: { time: "...", notes: "..." } }
            const result = await processAudio(audioBlob); 
            
            // D. Finalize: Update the specific Delivery Card with REAL data
            if (result && result.extracted) {
              setDeliveries(prev => prev.map(d => {
                if (d.id === deliveryId) {
                  return {
                    ...d,
                    status: 'confirmed', // Or determine status based on result.extracted.confirmation
                    confirmedTime: result.extracted.time || "Time not specified", 
                    notes: result.extracted.notes || result.text // Fallback to full text if no notes
                  };
                }
                return d;
              }));
            } else {
              // Handle case where AI couldn't extract data
              updateStatus(deliveryId, 'unavailable');
            }

          } catch (procErr) {
            console.error("Processing failed", procErr);
            updateStatus(deliveryId, 'failed');
            setError('Processing failed');
          } finally {
            // E. Cleanup
            stream.getTracks().forEach(track => track.stop());
            setActiveCallId(null);
            setIsRecording(false);
          }
        };

        // Start the recording
        mediaRecorderRef.current.start();
        setIsRecording(true);

      } catch (err) {
        setError('Failed to start recording: ' + err.message);
        console.error('Recording error:', err);
        // Reset status if permission denied or error
        updateStatus(deliveryId, 'pending'); 
        setActiveCallId(null);
      }
    };
    const stopLiveCall = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop(); // This triggers the .onstop event defined above
        setIsRecording(false);
      }
    };

    const startRecording = async () => {
      try {
        setError(null);
        setTranscription('');
        setExtractedData(null);
        setBookingResult(null);
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use webm codec for better compatibility
        const options = { mimeType: 'audio/webm' };
        mediaRecorderRef.current = new MediaRecorder(stream, options);
        audioChunksRef.current = [];
  
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
  
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
          
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };
  
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        setError('Failed to start recording: ' + err.message);
        console.error('Recording error:', err);
      }
    };
  
    const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    };
  
    const processAudio = async (audioBlob) => {
      setIsProcessing(true);
      setError(null);
  
      try {
        // Step 1: Transcribe audio using Whisper API
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
  
        const transcribeResponse = await axios.post('/api/transcribe', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
  
        const transcribedText = transcribeResponse.data.text;
        setTranscription(transcribedText);
  
        // Step 2: Extract structured data using DeepSeek R1
        const interpretResponse = await axios.post('/api/interpret', {
          text: transcribedText,
        });
  
        const extractedJson = interpretResponse.data;
        setExtractedData(extractedJson);
  
        // Step 3: Book the appointment (mock)
        const bookResponse = await axios.post('/api/book', extractedJson);
        
        setBookingResult(bookResponse.data);
  
  
      } catch (err) {
        setError('Processing error: ' + (err.response?.data?.error || err.message));
        console.error('Processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    };
  // const activeDelivery = deliveries.find(d => d.id === activeCallId);

  if (!isStyleLoaded) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontFamily: 'sans-serif',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg className="animate-spin" style={{animation: 'spin 1s linear infinite', width: '24px', height: '24px'}} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" />
          </svg>
          <span>Initializing System...</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-4 md:p-8">
      
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-blue-600" />
            AutoDispatch AI
          </h1>
          <p className="text-slate-500 text-sm mt-1">Automated Delivery Coordination System</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsAutoDialerOn(!isAutoDialerOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isAutoDialerOn 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isAutoDialerOn ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isAutoDialerOn ? 'Stop Auto-Dialer' : 'Start Queue'}
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Queue</p>
            <p className="text-2xl font-bold text-slate-700">{stats.pending}</p>
          </div>
          <div className="p-2 bg-gray-100 rounded-full text-gray-500"><Clock className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active</p>
            <p className="text-2xl font-bold text-blue-600">{activeCallId ? 1 : 0}</p>
          </div>
          <div className="p-2 bg-blue-100 rounded-full text-blue-600 animate-pulse"><Phone className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Unavailable</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="p-2 bg-red-100 rounded-full text-red-600"><XCircle className="w-5 h-5" /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Delivery List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Delivery Manifest</h2>
            <span className="text-sm text-slate-500">Today, {new Date().toLocaleDateString()}</span>
          </div>

          {deliveries.map((delivery) => (
            <Card key={delivery.id} className={`p-4 transition-all border-l-4 ${
              delivery.status === 'confirmed' ? 'border-l-green-500' : 
              delivery.status === 'unavailable' ? 'border-l-red-500' : 
              delivery.status === 'calling' ? 'border-l-blue-500' : 'border-l-gray-300'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{delivery.name}</h3>
                    <span className="text-slate-400 text-xs">• {delivery.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {delivery.address}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    {delivery.phone}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 min-w-[160px]">
                  <Badge status={delivery.status} />
                  
                  {delivery.status === 'confirmed' && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">
                        Slot: {delivery.confirmedTime}
                      </p>
                      {delivery.notes && (
                        <p className="text-xs text-slate-500 italic max-w-[200px] text-right">{delivery.notes}</p>
                      )}
                    </div>
                  )}

                  {delivery.status === 'pending' && (
                     <button 
                       onClick={() => startLiveCall(delivery.id)}
                       disabled={activeCallId !== null}
                       className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                     >
                       <Phone className="w-3 h-3" /> Call Now
                     </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Right Col: Live AI Console */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="h-[600px] flex flex-col overflow-hidden shadow-lg border-blue-100">
              {/* Scrollable Content Area */}
              <div className="flex-1 bg-white p-4 overflow-y-auto">
                
                <h1 className={`${styles.title} text-center mb-4`}>
                  Speech-to-Appointment Booking
                </h1>

                <p className={`${styles.description} mb-6 text-center`}>
                  Click the button below and say something like:<br />
                  <em>I want to book an appointment with Dr. Smith for next Tuesday at 2 PM</em>
                </p>

                {/* Controls */}
                <div className={`${styles.controls} flex justify-center mb-4`}>
                  {!isRecording ? (
                    <button
                      onClick={startRecording}
                      className={styles.startButton}
                      disabled={isProcessing}
                    >
                      Start Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className={styles.stopButton}
                    >
                      Stop Recording
                    </button>
                  )}
                </div>

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="flex flex-col items-center text-red-600 mb-4">
                    <span className={styles.pulse}></span>
                    <span className="text-sm mt-1">Recording...</span>
                  </div>
                )}

                {/* Processing */}
                {isProcessing && (
                  <div className="flex justify-center text-purple-600 text-sm mb-4">
                    Processing your request...
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="text-red-500 text-sm my-4 p-3 bg-red-50 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Transcription */}
                {transcription && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2">Transcription</h2>
                    <textarea
                      className={styles.textarea}
                      value={transcription}
                      readOnly
                      rows={4}
                    />
                  </div>
                )}

                {/* Extracted Data */}
                {extractedData && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2">Extracted Data</h2>
                    <pre className={`${styles.json} bg-slate-100 p-3 rounded`}>
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Booking Result */}
                {bookingResult && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2">Booking Confirmation</h2>
                    <div className="bg-green-100 text-green-700 p-3 rounded mb-2">
                      {bookingResult.message}
                    </div>
                    <pre className={`${styles.json} bg-slate-100 p-3 rounded`}>
                      {JSON.stringify(bookingResult.delivery, null, 2)}
                    </pre>
                  </div>
                )}

              </div>

              {/* Footer (same as old card footer) */}
              <div className="p-3 bg-white border-t text-xs text-slate-400 font-mono">
                System Ready • Voice Booking Module Active
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}