/**
 * Groq Llama Interpretation Route
 * * Accepts: Transcribed text from Whisper
 * Returns: Structured JSON with appointment details
 * * Flow:
 * 1. Receive transcription text
 * 2. Inject current date for relative date parsing
 * 3. Call Groq Llama API (FREE & FAST!)
 * 4. Extract structured appointment data (location, date, time, intent, confidence)
 * 5. Return JSON
 * * Benefits:
 * - FREE API access
 * - Super fast inference
 */

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    console.log('Processing transcription:', text);

    // Get current date for relative date parsing
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Calculate dates for reference
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    // Groq API configuration
    const groqApiKey = process.env.GROQ_API_KEY;

    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY not configured in .env.local');
    }

    // --- CRITICAL FIX: UPDATED SYSTEM PROMPT ---
    const systemPrompt = `You are an expert delivery coordination assistant. Extract structured delivery information from customer speech with high accuracy.

Current Date Context:
- Today is ${formattedDate} (${dayOfWeek})
- Tomorrow is ${tomorrowDate}

Instructions:
1. Ignore filler words (um, uh, like, you know, etc.)
2. Convert relative dates to absolute YYYY-MM-DD format.
3. Parse time in 24-hour format (HH:MM).
4. Extract the location: 
    - Street should contain the primary address line, **including landmarks or apartment/hostel details** if no formal house number is given.
    - House_Identifier should capture any explicit number or name (e.g., House 350, Apt 4B, Hostel D).
5. Determine intent: "available" (customer is home), "reschedule", "cancel", or "unavailable".
6. Provide confidence score based on information completeness.

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, just JSON.

Required JSON structure:
{
  "country": "string or null",
  "city": "string or null",
  "street": "string or null",
  "house number": "string or null",
  "date": "YYYY-MM-DD or null",
  "time": "HH:MM or null",
  "intent": "available|unavailable|reschedule|cancel",
  "confidence": 0.0-1.0
}`;
    // --- END CRITICAL FIX ---

    const userPrompt = `Extract appointment details from: "${text}"`;

    console.log('Calling Groq Llama API...');

    // Call Groq API (OpenAI-compatible endpoint)
    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile', // Fast and accurate
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.3, // Lower temperature for deterministic extraction
        max_tokens: 500,
        response_format: { type: 'json_object' }, // Force JSON output
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
      }
    );

    const aiResponse = groqResponse.data.choices[0].message.content;
    console.log('Groq Llama response:', aiResponse);

    // Parse JSON from response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                      aiResponse.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      
      extractedData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: try to extract JSON object from response
      const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        extractedData = JSON.parse(jsonObjectMatch[0]);
      } else {
        throw new Error('Failed to parse JSON from Groq response');
      }
    }

    // Validate and normalize fields
    const validatedData = {
      country: extractedData.country || null,
      city: extractedData.city || null,
      street: extractedData.street || null,
      houseNumber: extractedData['house number'] || null,
      date: extractedData.date || null,
      time: extractedData.time || null,
      intent: extractedData.intent || 'available',
      confidence: typeof extractedData.confidence === 'number' ? extractedData.confidence : 0.5,
    };

    console.log('Extracted delivery data:', validatedData);

    return res.status(200).json(validatedData);

  } catch (error) {
    console.error('Interpretation error:', error.response?.data || error.message);
    
    return res.status(500).json({
      error: 'Interpretation failed',
      details: error.response?.data?.error?.message || error.message,
    });
  }
}