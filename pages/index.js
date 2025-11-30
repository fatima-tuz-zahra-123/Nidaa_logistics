import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
// Note: styles import kept from your snippet, ensure the file exists
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
  Activity
} from 'lucide-react';

// Mock Data for initial state
const INITIAL_DELIVERIES = [
  { id: 1, name: "Sarah Jenkins", phone: "+1 (555) 012-3456", address: "123 Maple Ave, Springfield", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  { id: 2, name: "Mike Ross", phone: "+1 (555) 019-8765", address: "4500 Lincoln Blvd, Apt 4B", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  { id: 3, name: "Jessica Pearson", phone: "+1 (555) 011-2233", address: "880 Highland Park", status: "pending", confirmedTime: null, notes: "", transcript: [] },
  { id: 4, name: "Louis Litt", phone: "+1 (555) 017-5544", address: "Queens Rd, Block C", status: "pending", confirmedTime: null, notes: "", transcript: [] },
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

  // Audio/AI State
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Ensure Tailwind is loaded
  useEffect(() => {
    if (window.tailwind) {
      const timer = setTimeout(() => setIsStyleLoaded(true));
      return () => clearTimeout(timer);
    }
    const scriptId = 'tailwind-cdn';
    let script = document.getElementById(scriptId);
    if (script) {
      const checkInterval = setInterval(() => {
        if (window.tailwind) {
          setIsStyleLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    } else {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      script.onload = () => setTimeout(() => setIsStyleLoaded(true), 100);
      document.head.appendChild(script);
    }
  }, []);

  // Request microphone permissions
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

  // --- CORE FUNCTIONS ---

  const updateStatus = (id, status) => {
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Transcribe
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await axios.post('/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const transcribedText = transcribeResponse.data.text;
      setTranscription(transcribedText);

      // Step 2: Extract Data
      const interpretResponse = await axios.post('/api/interpret', {
        text: transcribedText,
      });

      const extractedJson = interpretResponse.data;
      setExtractedData(extractedJson);

      // Step 3: Book/Finalize
      // Assuming this endpoint returns { message: "...", delivery: { address, time, notes } }
      const bookResponse = await axios.post('/api/book', extractedJson);
      
      setBookingResult(bookResponse.data);
      
      // RETURN the data so the caller can use it immediately
      return bookResponse.data;

    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setError('Processing error: ' + errMsg);
      console.error('Processing error:', err);
      throw err; // Re-throw so startLiveCall knows it failed
    } finally {
      setIsProcessing(false);
    }
  };

  const startLiveCall = async (deliveryId) => {
    try {
      setError(null);
      setTranscription('');
      setExtractedData(null);
      setBookingResult(null);
      console.log("inside startLiveCall")
      setActiveCallId(deliveryId);
      updateStatus(deliveryId, 'calling'); 

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      // --- FIX 1: ADD THIS EVENT LISTENER ---
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      // --------------------------------------

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Safety check
        if (audioBlob.size === 0) {
            console.error("Audio blob was empty");
            updateStatus(deliveryId, 'unavailable'); // Or pending if you prefer
            return;
        }

        updateStatus(deliveryId, 'analyzing');

        try {
          const result = await processAudio(audioBlob); 
          const bookingRecord = result.delivery || extractedData;
          
          // Determine intent: if intent is 'reschedule' or missing essential fields,
          // we treat it as a "Reschedule Needed" scenario but keep the card actionable.
          const isConfirmed = bookingRecord && bookingRecord.intent === 'available';

          if (isConfirmed) {
            setDeliveries(prev => prev.map(d => {
              if (d.id === deliveryId) {
                
                // Construct Address Dynamically
                const addressParts = [
                  bookingRecord['house number'], 
                  bookingRecord.street,          
                  bookingRecord.city,            
                  bookingRecord.country          
                ].filter(part => part && part !== 'null' && part !== null);

                const newAddress = addressParts.length > 0 ? addressParts.join(', ') : d.address;
                const newTime = bookingRecord.time || null; 

                return {
                  ...d,
                  status: 'confirmed',
                  address: newAddress,
                  confirmedTime: newTime,
                  notes: bookingRecord.notes || result.text || "Voice confirmation"
                };
              }
              return d;
            }));
          } else {
            // --- CHANGE HERE: Intent was NOT 'available' (e.g. reschedule/unavailable) ---
            // Instead of marking it as 'unavailable' (red badge, no button),
            // we revert it to 'pending' so the user can try calling again.
            // You can also add a toast/notification here saying "Reschedule Requested"
            console.log("Intent was not available, reverting to pending for retry.");
            updateStatus(deliveryId, 'pending');
          }

        } catch (procErr) {
          console.error("Processing flow failed", procErr);
          // On error, also revert to pending to allow retry
          updateStatus(deliveryId, 'pending');
        } finally {
          stream.getTracks().forEach(track => track.stop());
          setActiveCallId(null);
          setIsRecording(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      } catch (err) {
        setError('Failed to start call: ' + err.message);
        updateStatus(deliveryId, 'pending'); 
        setActiveCallId(null);
      }
  };

  const stopLiveCall = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Standalone recording (for the right panel demo without updating a card)
  const startRecording = async () => {
    try {
      setError(null);
      setTranscription('');
      setExtractedData(null);
      setBookingResult(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // --- UTILITY EFFECTS ---

  // Auto-dialer logic
  useEffect(() => {
    if (isAutoDialerOn && !activeCallId) {
      const nextPending = deliveries.find(d => d.status === 'pending');
      if (nextPending) {
        // Automatically start the live call flow for the next pending item
        const timer = setTimeout(() => {
          startLiveCall(nextPending.id);
        }, 1000);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setIsAutoDialerOn(false), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isAutoDialerOn, activeCallId, deliveries]);

  // Scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [deliveries]);

  const stats = {
    total: deliveries.length,
    confirmed: deliveries.filter(d => d.status === 'confirmed').length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    failed: deliveries.filter(d => d.status === 'unavailable').length,
  };

  // --- RENDER ---

  if (!isStyleLoaded) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500 font-sans">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Initializing System...
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
          {/* Note: Auto-dialer will require user interaction to allow mic access in some browsers */}
          <button 
            onClick={() => setIsAutoDialerOn(!isAutoDialerOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isAutoDialerOn 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isAutoDialerOn ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isAutoDialerOn ? 'Stop Queue' : 'Start Queue'}
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
                      {/* DYNAMIC TIME COLOR LOGIC */}
                      <p className={`text-sm font-bold ${delivery.confirmedTime ? 'text-green-700' : 'text-red-500'}`}>
                        Slot: {delivery.confirmedTime || "Time Missing"}
                      </p>
                      
                      {delivery.notes && (
                        <p className="text-xs text-slate-500 italic max-w-[200px] text-right">
                          {delivery.notes}
                        </p>
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
                  {/* Show Stop button if this is the active call */}
                  {activeCallId === delivery.id && isRecording && (
                    <button 
                      onClick={stopLiveCall}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                      <Pause className="w-3 h-3" /> End Call
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
              <div className="flex-1 bg-white p-4 overflow-y-auto" ref={scrollRef}>
                
                <h1 className={`${styles.title} text-center mb-4`}>
                  Speech-to-Booking Console
                </h1>

                <p className={`${styles.description} mb-6 text-center text-sm text-slate-500`}>
                  Use this console to test the AI directly, or use the {`"Call Now"`} buttons on the left to simulate a delivery call.
                </p>

                {/* Controls for Standalone Mode */}
                <div className={`${styles.controls} flex justify-center mb-4`}>
                  {!isRecording || activeCallId ? (
                    <button
                      onClick={startRecording}
                      disabled={isRecording || isProcessing}
                      className={styles.startButton}
                    >
                      Test AI Recording
                    </button>
                  ) : (
                    <button
                      onClick={stopRecording}
                      className={styles.stopButton}
                    >
                      Stop Test
                    </button>
                  )}
                </div>

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="flex flex-col items-center text-red-600 mb-4">
                    <span className={styles.pulse}></span>
                    <span className="text-sm mt-1">
                        {activeCallId ? `On Call with ID: ${activeCallId}` : "Recording..."}
                    </span>
                  </div>
                )}

                {/* Processing */}
                {isProcessing && (
                  <div className="flex justify-center text-purple-600 text-sm mb-4">
                    <Loader2 className="animate-spin w-4 h-4 mr-2" /> Processing Audio...
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
                    <h2 className="font-semibold text-slate-700 mb-2 text-xs uppercase">Transcription</h2>
                    <div className="p-3 bg-slate-50 rounded text-sm italic border border-slate-100">
                      "{transcription}"
                    </div>
                  </div>
                )}

                {/* Extracted Data */}
                {extractedData && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2 text-xs uppercase">Extracted Entities</h2>
                    <pre className={`${styles.json} bg-slate-100 p-3 rounded text-xs overflow-auto`}>
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Booking Result */}
                {bookingResult && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2 text-xs uppercase">Booking Result</h2>
                    <div className="bg-green-50 text-green-700 p-3 rounded mb-2 text-sm border border-green-100">
                      {bookingResult.message || "Processed Successfully"}
                    </div>
                    <pre className={`${styles.json} bg-slate-100 p-3 rounded text-xs overflow-auto`}>
                      {JSON.stringify(bookingResult.delivery, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
              
              <div className="p-3 bg-white border-t text-xs text-slate-400 font-mono text-center">
                System Ready • Voice Module Active
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}