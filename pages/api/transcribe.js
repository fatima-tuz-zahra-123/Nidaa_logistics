/**
 * Groq Whisper API Transcription Route
 * Debug Mode Enabled
 */

import formidable from 'formidable';
import FormData from 'form-data';
import axios from 'axios';
import fs from 'fs';

// Disable Next.js body parser to allow formidable to handle the request
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 1. Log entry point
  console.log(`\n--- [${new Date().toISOString()}] Transcribe API Request Received ---`);
  console.log(`Method: ${req.method}`);

  if (req.method !== 'POST') {
    console.warn('❌ Invalid Method. Expected POST.');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Log start of form parsing
    console.log('Initializing formidable for file parsing...');
    const form = formidable({
      maxFileSize: 25 * 1024 * 1024, // 25MB limit
    });
    
    console.log('Parsing request form data...');
    const [fields, files] = await form.parse(req);
    
    console.log('Form parsing complete.');
    console.log('Fields received:', Object.keys(fields));
    console.log('Files received:', Object.keys(files));

    // 3. Log file details
    const audioFile = files.audio?.[0];
    if (!audioFile) {
      console.error('❌ Error: "audio" file is missing from the request.');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log('✅ Audio file detected:', {
      tempPath: audioFile.filepath,
      originalName: audioFile.originalFilename,
      mimeType: audioFile.mimetype,
      sizeBytes: audioFile.size,
    });

    // 4. Validate API Key
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('❌ CRITICAL ERROR: GROQ_API_KEY is missing in .env.local');
      throw new Error('GROQ_API_KEY not configured');
    }
    console.log('✅ API Key found (Length: ' + groqApiKey.length + ')');

    // 5. Setup FormData for external API
    console.log('Preparing FormData for Groq API...');
    try {
        const formData = new FormData();
        const fileStream = fs.createReadStream(audioFile.filepath);
        
        // Log stream errors
        fileStream.on('error', (err) => console.error('❌ File Read Stream Error:', err));

        formData.append('file', fileStream, {
        filename: audioFile.originalFilename || 'audio.webm',
        contentType: audioFile.mimetype || 'audio/webm',
        });
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'en'); 
        formData.append('response_format', 'json');
        console.log('FormData constructed successfully.');
        
        // 6. Send Request
        console.log('🚀 Sending request to Groq Whisper API (https://api.groq.com/openai/v1/audio/transcriptions)...');
        const startTime = Date.now();

        const whisperResponse = await axios.post(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        formData,
        {
            headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${groqApiKey}`,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }
        );

        const duration = Date.now() - startTime;
        console.log(`✅ Groq API Response received in ${duration}ms`);
        console.log('Response Status:', whisperResponse.status);

        // 7. Cleanup
        console.log('Cleaning up temporary file:', audioFile.filepath);
        try {
            fs.unlinkSync(audioFile.filepath);
            console.log('Temp file deleted.');
        } catch (cleanupErr) {
            console.warn('⚠️ Warning: Failed to delete temp file:', cleanupErr.message);
        }

        const transcribedText = whisperResponse.data.text;
        console.log('📝 Transcription Result Preview:', transcribedText.substring(0, 50) + '...');

        return res.status(200).json({
        text: transcribedText,
        success: true,
        });

    } catch (innerError) {
        // Catch errors specifically during the Axios call or file setup
        throw innerError;
    }

  } catch (error) {
    // 8. Global Error Handler with detailed logging
    console.error('\n❌ --- TRANSCRIPTION PROCESS FAILED ---');
    console.error('Error Message:', error.message);

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Groq API Error Status:', error.response.status);
      console.error('Groq API Error Headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('Groq API Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Groq API No Response. Request details:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Setup Error:', error.message);
    }
    
    return res.status(500).json({
      error: 'Transcription failed',
      details: error.response?.data?.error?.message || error.message,
    });
  }
}