/**
 * Text-to-Speech API endpoint
 * Generates audio from text for robot voice in call system
 * Uses OpenAI TTS or fallback to browser-based TTS
 */

export default async function handler(req, res) {
  console.log(`\n--- [${new Date().toISOString()}] TTS API Request ---`);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'echo', speed = 1.0 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log('Text to speak:', text);
    console.log('Voice:', voice, 'Speed:', speed);

    const openaiKey = process.env.OPENAI_API_KEY;

    // Option 1: Use OpenAI TTS if API key is available
    // if (openaiKey) {
    //   console.log('Using OpenAI TTS API');
      
    //   const axios = require('axios');
      
    //   const ttsResponse = await axios.post(
    //       'https://api.openai.com/v1/audio/speech',
    //       {
    //         model: 'tts-1',
    //         voice: voice,
    //         input: text,
    //         speed: speed
    //       },
    //       {
    //         headers: {
    //           'Authorization': `Bearer ${openaiKey}`,
    //           'Content-Type': 'application/json'
    //         },
    //         responseType: 'arraybuffer' // We still need this for success
    //       }
    //     );

    //   console.log('✅ OpenAI TTS successful');
      
    //   // Return audio as base64
    //   const audioBase64 = Buffer.from(ttsResponse.data).toString('base64');
    //   return res.status(200).json({
    //     success: true,
    //     audio: audioBase64,
    //     format: 'mp3',
    //     method: 'openai'
    //   });
    // } 
    
    // Option 2: Return text for browser-based TTS
    console.log('⚠️ No OpenAI API key, will use browser TTS');
    return res.status(200).json({
      success: true,
      text: text,
      method: 'browser',
      message: 'Use browser Web Speech API'
    });

  } catch (axiosError) {
        // 1. Check if we have a response from OpenAI
        if (axiosError.response) {
          // 2. The response is a Buffer, so we must convert it to text to read the error
          const errorText = Buffer.from(axiosError.response.data).toString('utf-8');
          console.error("\n🔴 OPENAI API ERROR DETAILS:");
          console.error(`Status: ${axiosError.response.status}`);
          console.error(`Message: ${errorText}\n`);
          
          throw new Error(`OpenAI API Error: ${errorText}`);
        }
        throw axiosError; // Re-throw other errors (network, etc)
      }
}
