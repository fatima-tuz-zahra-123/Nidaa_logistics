import { useState, useRef, useEffect } from 'react';
import Head from "next/head";
import axios from 'axios';
import styles from "@/styles/Home.module.css";

export default function Home() {
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

  return (
    <>
      <Head>
        <title>Speech-to-Appointment Booking</title>
        <meta name="description" content="Book appointments using voice commands" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>
            Speech-to-Appointment Booking
          </h1>

          <p className={styles.description}>
            Click the button below and say something like:<br />
            <em>"I want to book an appointment with Dr. Smith for next Tuesday at 2 PM"</em>
          </p>

          <div className={styles.controls}>
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

          {isRecording && (
            <div className={styles.recordingIndicator}>
              <span className={styles.pulse}></span>
              Recording...
            </div>
          )}

          {isProcessing && (
            <div className={styles.processing}>
              Processing your request...
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {transcription && (
            <div className={styles.section}>
              <h2>Transcription</h2>
              <textarea 
                className={styles.textarea}
                value={transcription}
                readOnly
                rows={4}
              />
            </div>
          )}

          {extractedData && (
            <div className={styles.section}>
              <h2>Extracted Data</h2>
              <pre className={styles.json}>
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </div>
          )}

          {bookingResult && (
            <div className={styles.section}>
              <h2>Booking Confirmation</h2>
              <div className={styles.success}>
                {bookingResult.message}
              </div>
              <pre className={styles.json}>
                {JSON.stringify(bookingResult.appointment, null, 2)}
              </pre>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
