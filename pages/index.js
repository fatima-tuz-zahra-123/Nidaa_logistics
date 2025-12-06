import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '../utils/supabaseClient'; // Connected to Supabase
import { useRouter } from 'next/router';
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
  Truck,
  LogOut,
  RotateCcw
} from 'lucide-react';
const currentDate = new Date().toISOString();
// --- COMPONENTS ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }) => {
  const s = status ? status.toLowerCase() : 'pending';
  const styles = {
    pending: "bg-gray-100 text-gray-600 border-gray-200",
    calling: "bg-blue-50 text-blue-600 border-blue-200 animate-pulse",
    analyzing: "bg-purple-50 text-purple-600 border-purple-200",
    confirmed: "bg-green-50 text-green-600 border-green-200",
    unavailable: "bg-red-50 text-red-600 border-red-200",
  };
  const labels = {
    pending: "Queued", calling: "Dialing...",
    analyzing: "Extracting...", confirmed: "Ready",
    unavailable: "Reschedule",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[s] || styles.pending} flex items-center gap-2 w-fit`}>
      {s === 'calling' && <Loader2 className="w-3 h-3 animate-spin" />}
      {s === 'confirmed' && <CheckCircle className="w-3 h-3" />}
      {s === 'unavailable' && <XCircle className="w-3 h-3" />}
      {labels[s] || status}
    </span>
  );
};

export default function App() {
  const [deliveries, setDeliveries] = useState([]); // Loads from Supabase
  const [activeCallId, setActiveCallId] = useState(null);
  const [isAutoDialerOn, setIsAutoDialerOn] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const router = useRouter();
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
  const mimeTypeRef = useRef(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // --- 1. SUPABASE AUTH & DATA ---
  
  // Wrapped in useCallback to prevent ESLint warning loops
  const fetchDeliveries = useCallback(async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .order('id', { ascending: true });
    
    if (data) {
      // FIX: Reset any 'stuck' calls from previous sessions
      const stuckCalls = data.filter(d => d.status === 'calling');
      if (stuckCalls.length > 0) {
        console.log("Resetting stuck calls:", stuckCalls.map(d => d.id));
        for (const call of stuckCalls) {
          await supabase.from('deliveries').update({ status: 'pending' }).eq('id', call.id);
        }
        // Re-fetch to get clean state
        const { data: cleanData } = await supabase.from('deliveries').select('*').order('id', { ascending: true });
        setDeliveries(cleanData || data);
      } else {
        setDeliveries(data);
      }
    }
    if (error) console.error("DB Error:", error);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
      else fetchDeliveries();
    };
    checkUser();

    // Realtime Listener
    const channel = supabase
      .channel('realtime_deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => {
        fetchDeliveries(); 
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [router, fetchDeliveries]);

  // Tailwind Loader
  useEffect(() => {
    if (window.tailwind) setTimeout(() => setIsStyleLoaded(true));
    else {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      script.onload = () => setTimeout(() => setIsStyleLoaded(true), 100);
      document.head.appendChild(script);
    }
  }, []);

  // Request microphone permissions and find best device
  useEffect(() => {
    const initAudio = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioInputs = devices.filter(device => device.kind === 'audioinput');
          
          const bestDevice = audioInputs.find(d => {
            const label = d.label.toLowerCase();
            return (label.includes('built-in') || label.includes('internal') || label.includes('macbook')) && 
                   !label.includes('boom') && !label.includes('virtual');
          });

          if (bestDevice) {
            setSelectedDeviceId(bestDevice.deviceId);
          } else if (audioInputs.length > 0) {
             const nonBoom = audioInputs.find(d => !d.label.toLowerCase().includes('boom'));
             if (nonBoom) {
                setSelectedDeviceId(nonBoom.deviceId);
             }
          }
        } catch (err) {
          setError('Microphone access denied. Please enable microphone permissions.');
          console.error('Microphone error:', err);
        }
      }
    };
    initAudio();
  }, []);

  // --- 2. AUDIO LOGIC (ORIGINAL INTEGRATION) ---

  const getSupportedMimeType = () => {
    const types = [
      'audio/mp4', // Prefer MP4 for Safari/macOS
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg',
      'audio/wav',
      'audio/aac'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; 
  };

  const updateStatus = useCallback(async (id, status) => {
    await supabase.from('deliveries').update({ status }).eq('id', id);
  }, []);

  const processAudio = useCallback(async (audioBlob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      const mimeType = mimeTypeRef.current || 'audio/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : 
                        mimeType.includes('wav') ? 'wav' : 
                        mimeType.includes('ogg') ? 'ogg' : 
                        mimeType.includes('aac') ? 'aac' : 'webm';
      
      formData.append('audio', audioBlob, `recording.${extension}`); 

      const transcribeResponse = await axios.post('/api/transcribe', formData);

      const transcribedText = transcribeResponse.data.text;
      setTranscription(transcribedText);

      const interpretResponse = await axios.post('/api/interpret', { text: transcribedText });
      const extractedJson = interpretResponse.data;
      setExtractedData(extractedJson);

      const resultData = { delivery: extractedJson, message: "Processed" };
      setBookingResult(resultData);
      
      return resultData;

    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setError('Backend Error: ' + errMsg);
      throw err; 
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const startLiveCall = useCallback(async (deliveryId) => {
    try {
      setError(null);
      setTranscription('');
      setExtractedData(null);
      setBookingResult(null);
      setActiveCallId(deliveryId);
      updateStatus(deliveryId, 'calling'); 

      const constraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const options = mimeType ? { mimeType } : undefined;
      
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        if (audioBlob.size === 0) {
            updateStatus(deliveryId, 'unavailable');
            return;
        }

        updateStatus(deliveryId, 'analyzing');

        try {
          const result = await processAudio(audioBlob); 
          const bookingRecord = result.delivery || extractedData;
          
          if (bookingRecord) {
             const { data: currentData } = await supabase
                .from('deliveries')
                .select('address')
                .eq('id', deliveryId)
                .single();

             const currentAddress = currentData?.address || '';

             // 1. CONSTRUCT CLEAN ADDRESS
             const addressParts = [
                  bookingRecord['house number'],
                  bookingRecord.street,
                  bookingRecord.city,
                  bookingRecord.country
                ].filter(part => part && part !== 'null' && part !== null);

             const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : currentAddress;
             
             // 2. CREATE GOOGLE MAPS LINK (NEW LOGIC)
             const mapQuery = encodeURIComponent(fullAddress);
             const mapLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
             
             // 3. UPDATE DATABASE
             await supabase.from('deliveries').update({
                status: 'confirmed',
                confirmed_address: fullAddress, 
                city: bookingRecord.city,
                delivery_time: bookingRecord.time,
                intent: bookingRecord.intent,
                map_link: mapLink, // <-- PUSH LINK TO DB
             }).eq('id', deliveryId);
             
             // 4. UPDATE LOCAL STATE (Triggering Re-render)
             setDeliveries(prev => prev.map(d => {
                if (d.id === deliveryId) {
                  return {
                    ...d,
                    status: 'confirmed',
                    confirmed_address: fullAddress,
                    city: bookingRecord.city,
                    delivery_time: bookingRecord.time,
                    map_link: mapLink, // <-- PUSH LINK TO LOCAL STATE
                    intent: bookingRecord.intent,
                    date: bookingRecord.date
                  };
                }
                return d;
             }));
          } else {
            updateStatus(deliveryId, 'unavailable');
          }
        } catch (procErr) {
          updateStatus(deliveryId, 'unavailable');
        } finally {
          stream.getTracks().forEach(track => track.stop());
          setActiveCallId(null);
          setIsRecording(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      } catch (err) {
        setError('Mic Error: ' + err.message);
        setActiveCallId(null);
      }
  }, [updateStatus, processAudio, extractedData, selectedDeviceId]);

  const stopLiveCall = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Standalone Recording ("Test AI")
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setTranscription('');
      setExtractedData(null);
      setBookingResult(null);
      
      const constraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      const options = mimeType ? { mimeType } : undefined;

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
         if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const mimeType = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        if (audioBlob.size < 1000) {
            console.warn("Audio blob too small, likely silence or error.");
        }

        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Recording Error: ' + err.message);
    }
  }, [processAudio, selectedDeviceId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // --- NEW: RESET ALL STATUSES FUNCTION ---
  const resetAllStatuses = async () => {
    if (activeCallId !== null) {
      alert("Please wait for the current call to finish before resetting the queue.");
      return;
    }
    
    // Safety check (using window.confirm as custom modals aren't built here)
    if (window.confirm("Are you sure you want to reset ALL confirmed and failed delivery statuses back to 'Pending'?")) {
      setIsAutoDialerOn(false); // Stop the dialer immediately

      const { error } = await supabase
        .from('deliveries')
        .update({ status: 'pending' })
        .neq('status', 'pending'); // Only update non-pending statuses (more efficient)

      if (error) {
        setError("Failed to reset queue: " + error.message);
        console.error("Supabase Reset Error:", error);
      } else {
        // Trigger a re-fetch to update the UI
        fetchDeliveries(); 
      }
    }
  };

  // Auto-dialer
  useEffect(() => {
    if (isAutoDialerOn && !activeCallId && !isRecording) {
      const nextPending = deliveries.find(d => !d.status || d.status.toLowerCase() === 'pending');
      if (nextPending) {
        const timer = setTimeout(() => startLiveCall(nextPending.id), 1000);
        return () => clearTimeout(timer);
      } else {
        const timer = setTimeout(() => setIsAutoDialerOn(false), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [isAutoDialerOn, activeCallId, isRecording, deliveries, startLiveCall]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcription, extractedData]);

  const stats = {
    total: deliveries.length,
    confirmed: deliveries.filter(d => d.status === 'confirmed').length,
    pending: deliveries.filter(d => ['pending', 'Pending'].includes(d.status)).length,
    failed: deliveries.filter(d => d.status === 'unavailable').length,
  };

  if (!isStyleLoaded) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500 font-sans">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Initializing System...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-4 md:p-8">
      
      {/* Header with Logout & Start Queue */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="text-blue-600" />
            AutoDispatch AI
          </h1>
          <p className="text-slate-500 text-sm mt-1">Supabase Connected System</p>
        </div>

        <div className="flex gap-3">
          {/* NEW RESET BUTTON */}
          <button 
             onClick={resetAllStatuses} 
             disabled={activeCallId !== null}
             className="flex items-center gap-2 px-4 py-2 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-200 text-sm font-medium disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset All
          </button>
          
          {/* UPDATED LOGOUT BUTTON */}
          <button 
             onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
             className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>

          <button 
            onClick={() => setIsAutoDialerOn(!isAutoDialerOn)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isAutoDialerOn ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-900 text-white hover:bg-slate-800'
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
          <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Queue</p><p className="text-2xl font-bold text-slate-700">{stats.pending}</p></div>
          <div className="p-2 bg-gray-100 rounded-full text-gray-500"><Clock className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Confirmed</p><p className="text-2xl font-bold text-green-600">{stats.confirmed}</p></div>
          <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Active</p><p className="text-2xl font-bold text-blue-600">{activeCallId ? 1 : 0}</p></div>
          <div className="p-2 bg-blue-100 rounded-full text-blue-600 animate-pulse"><Phone className="w-5 h-5" /></div>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Unavailable</p><p className="text-2xl font-bold text-red-600">{stats.failed}</p></div>
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

          {deliveries.length === 0 && <p className="text-gray-400">No deliveries found. Check Database.</p>}

          {deliveries.map((delivery) => (
            <Card key={delivery.id} className={`p-4 transition-all border-l-4 ${
              delivery.status === 'confirmed' ? 'border-l-green-500' : 
              delivery.status === 'unavailable' ? 'border-l-red-500' : 
              delivery.status === 'calling' ? 'border-l-blue-500' : 'border-l-gray-300'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{delivery.customer_name}</h3>
                    {/* ADDED DATE DISPLAY HERE */}
                    <span className="text-slate-500 text-xs font-medium">
                      (Date: {((delivery.date !== null && delivery.date !== undefined && delivery.date !== '') ? delivery.date : new Date().toLocaleDateString())})
                    </span>
                    <span className="text-slate-400 text-xs">• {delivery.id}</span>
                  </div>
                  
                  {/* ADDRESS DISPLAY WITH GOOGLE MAPS LINK */}
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                    {delivery.map_link ? (
                      <a href={delivery.map_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        {delivery.confirmed_address || delivery.address}
                      </a>
                    ) : (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {delivery.address}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Smartphone className="w-4 h-4 text-slate-400" />
                    {delivery.phone_number}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 min-w-[160px]">
                  <Badge status={delivery.status} />
                  
                  {delivery.status === 'confirmed' && (
                    <div className="text-right">
                      <p className={`text-sm font-bold text-green-700`}>
                        Slot: {delivery.delivery_time || "ASAP"}
                      </p>
                    </div>
                  )}

                  {(delivery.status === 'pending' || delivery.status === 'Pending') && (
                     <button 
                       onClick={() => startLiveCall(delivery.id)}
                       disabled={activeCallId !== null}
                       className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                     >
                       <Phone className="w-3 h-3" /> Call Now
                     </button>
                  )}
                  {activeCallId === delivery.id && isRecording && (
                    <button onClick={stopLiveCall} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 flex items-center gap-2">
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
                
                <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Speech-to-Booking Console</h1>
                <p className="mb-6 text-center text-sm text-slate-500">
                  Use this console to test the AI directly, or use the {`"Call Now"`} buttons on the left.
                </p>

                <div className="flex justify-center mb-6">
                  {!isRecording || activeCallId ? (
                    <button 
                      onClick={startRecording} 
                      disabled={isRecording || isProcessing} 
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Smartphone className="w-5 h-5" /> Test AI Recording
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording} 
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-md transition-all flex items-center gap-2"
                    >
                      <Pause className="w-5 h-5" /> Stop Test
                    </button>
                  )}
                </div>

                {isRecording && (
                  <div className="flex flex-col items-center text-red-600 mb-4">
                    <span className={styles.pulse}></span>
                    <span className="text-sm mt-1">{activeCallId ? `On Call: ${activeCallId}` : "Recording..."}</span>
                  </div>
                )}

                {isProcessing && <div className="flex justify-center text-purple-600 text-sm mb-4"><Loader2 className="animate-spin w-4 h-4 mr-2" /> Processing...</div>}

                {error && <div className="text-red-500 text-sm my-4 p-3 bg-red-50 rounded-md border border-red-200">{error}</div>}

                {transcription && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2 text-xs uppercase">Transcription</h2>
                    <div className="p-3 bg-slate-50 rounded text-sm italic border border-slate-100">&quot;{transcription}&quot;</div>
                  </div>
                )}

                {extractedData && (
                  <div className={`${styles.section} mb-4`}>
                    <h2 className="font-semibold text-slate-700 mb-2 text-xs uppercase">Extracted Entities</h2>
                    <pre className={`${styles.json} bg-slate-100 p-3 rounded text-xs overflow-auto`}>
                      {JSON.stringify(extractedData, null, 2)}
                    </pre>
                  </div>
                )}
                
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