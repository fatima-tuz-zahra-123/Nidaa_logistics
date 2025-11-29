/**
 * Mock Delivery Booking Route
 * 
 * Accepts: Structured delivery data from AI extraction
 * Returns: Mock success confirmation
 * 
 * Flow:
 * 1. Receive extracted delivery JSON
 * 2. Log delivery details with timestamp
 * 3. Return mock booking confirmation
 * 
 * Future Enhancement:
 * - Check customer availability in real-time
 * - Store delivery preferences in database
 * - Send confirmation SMS/email
 * - Integrate with delivery scheduling system
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const deliveryData = req.body;

    // Validate delivery data
    if (!deliveryData || typeof deliveryData !== 'object') {
      return res.status(400).json({ error: 'Invalid delivery data' });
    }

    // Generate mock delivery ID
    const deliveryId = `DLV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Current timestamp
    const timestamp = new Date().toISOString();

    // Construct delivery details
    const delivery = {
      deliveryId,
      country: deliveryData.country || null,
      city: deliveryData.city || null,
      street: deliveryData.street || null,
      houseNumber: deliveryData['house number'] || null,
      date: deliveryData.date || null,
      time: deliveryData.time || null,
      intent: deliveryData.intent || 'available',
      confidence: deliveryData.confidence || 0.0,
      status: deliveryData.intent === 'available' ? 'pending_confirmation' : 'unavailable',
      requestedAt: timestamp,
    };

    // Log delivery to console (simulates database storage)
    console.log('\n========================================');
    console.log('📦 NEW DELIVERY REQUEST');
    console.log('========================================');
    console.log('Delivery ID:', delivery.deliveryId);
    console.log('Country:', delivery.country);
    console.log('City:', delivery.city);
    console.log('Street:', delivery.street);
    console.log('House Number:', delivery.houseNumber);
    console.log('Date:', delivery.date);
    console.log('Time:', delivery.time);
    console.log('Intent:', delivery.intent);
    console.log('Confidence:', delivery.confidence);
    console.log('Status:', delivery.status);
    console.log('Requested At:', delivery.requestedAt);
    console.log('========================================\n');

    // Determine success message based on confidence
    let message;
    if (delivery.confidence >= 0.8) {
      message = '✅ Delivery details confirmed! You will receive a confirmation shortly.';
    } else if (delivery.confidence >= 0.5) {
      message = '⚠️ Delivery request received. Our team may contact you to confirm details.';
    } else {
      message = '❓ We received your request but need more information. Someone will contact you soon.';
    }

    // Return mock success response
    return res.status(200).json({
      success: true,
      message,
      delivery,
    });

  } catch (error) {
    console.error('Delivery booking error:', error.message);
    
    return res.status(500).json({
      error: 'Delivery booking failed',
      details: error.message,
    });
  }
}