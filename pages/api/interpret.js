/**
 * Groq Llama Interpretation Route
 * 
 * Accepts: Transcribed text from Whisper
 * Returns: Structured JSON with appointment details
 * 
 * Flow:
 * 1. Receive transcription text
 * 2. Inject current date for relative date parsing
 * 3. Call Groq Llama API (FREE & FAST!)
 * 4. Extract structured appointment data (doctor, specialty, date, time, intent, confidence)
 * 5. Return JSON
 * 
 * Groq Llama handles:
 * - Filler word filtering ("um", "uh", etc.)
 * - Relative date parsing ("tomorrow", "next Tuesday", "next week")
 * - Natural language understanding
 * - JSON extraction with confidence scoring
 * 
 * Benefits:
 * - FREE API access
 * - Super fast inference
 * - High accuracy with llama-3.3-70b-versatile
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

    // Construct prompt for Groq Llama
    const systemPrompt = `You are an expert delivery coordination assistant. Extract structured delivery information from customer speech with high accuracy, including:
          - Whether the customer is available to receive the parcel
          - The delivery location
          - The preferred time slot for delivery
          - Any additional instructions or notes
          - Intent: confirm, reschedule, unavailable, or inquiry
          - Provide a confidence score based on clarity and completeness.

Current Date Context:
- Today is ${formattedDate} (${dayOfWeek})
- Tomorrow is ${tomorrowDate}

Instructions:
1. Ignore filler words (um, uh, like, you know, etc.)
2. Convert relative dates to absolute YYYY-MM-DD format:
   - "tomorrow" → ${tomorrowDate}
   - "next Tuesday" → calculate next occurrence of Tuesday from ${formattedDate}
   - "in 3 days" → calculate 3 days from today
   - If day of week is mentioned, find next occurrence
3. Parse time in 24-hour format (HH:MM):
   - "2 PM" → "14:00"
   - "morning" → "09:00"
   - "afternoon" → "14:00"
   - "evening" → "18:00"
4. Extract the location (eg; 350 Madison Avenue New York USA)
5. Extract the country from the location (eg, USA)
6. Extract the city from the location (eg, New York)
7. Extract the street from the location (eg, Madison Avenue)
8. Extract the House Number from the location (eg, 350)
9. Determine intent: "available" (default for appointments), "reschedule", "cancel", or "unavailable"
10. Provide confidence score based on information completeness:
   - 0.9-1.0: All fields present and clear
   - 0.7-0.9: Most fields present
   - 0.5-0.7: Some ambiguity
   - 0.0-0.5: Missing critical information

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
