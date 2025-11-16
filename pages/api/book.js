/**
 * Mock Appointment Booking Route
 * 
 * Accepts: Structured appointment data from DeepSeek interpretation
 * Returns: Mock success confirmation
 * 
 * Flow:
 * 1. Receive extracted appointment JSON
 * 2. Log appointment details with timestamp
 * 3. Return mock booking confirmation
 * 
 * Future Enhancement:
 * - Check doctor availability against database
 * - Store appointment in database
 * - Send confirmation email/SMS
 * - Integrate with calendar systems
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const appointmentData = req.body;

    // Validate appointment data
    if (!appointmentData || typeof appointmentData !== 'object') {
      return res.status(400).json({ error: 'Invalid appointment data' });
    }

    // Generate mock booking ID
    const bookingId = `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Current timestamp
    const timestamp = new Date().toISOString();

    // Construct appointment details
    const appointment = {
      bookingId,
      doctor: appointmentData.doctor || 'Not specified',
      speciality: appointmentData.speciality || 'General consultation',
      date: appointmentData.date || 'To be confirmed',
      time: appointmentData.time || 'To be confirmed',
      intent: appointmentData.intent || 'inquiry',
      confidence: appointmentData.confidence || 0.0,
      status: 'pending_confirmation',
      bookedAt: timestamp,
    };

    // Log appointment to console (simulates database storage)
    console.log('\n========================================');
    console.log('📅 NEW APPOINTMENT BOOKING');
    console.log('========================================');
    console.log('Booking ID:', appointment.bookingId);
    console.log('Doctor:', appointment.doctor);
    console.log('Speciality:', appointment.speciality);
    console.log('Date:', appointment.date);
    console.log('Time:', appointment.time);
    console.log('Intent:', appointment.intent);
    console.log('Confidence:', appointment.confidence);
    console.log('Status:', appointment.status);
    console.log('Booked At:', appointment.bookedAt);
    console.log('========================================\n');

    // Determine success message based on confidence
    let message;
    if (appointment.confidence >= 0.8) {
      message = '✅ Appointment booked successfully! You will receive a confirmation shortly.';
    } else if (appointment.confidence >= 0.5) {
      message = '⚠️ Appointment request received. Our team will confirm the details with you.';
    } else {
      message = '❓ We received your request but need more information. Someone will contact you soon.';
    }

    // Return mock success response
    return res.status(200).json({
      success: true,
      message,
      appointment,
    });

  } catch (error) {
    console.error('Booking error:', error.message);
    
    return res.status(500).json({
      error: 'Booking failed',
      details: error.message,
    });
  }
}
