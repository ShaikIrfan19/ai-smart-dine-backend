const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent to ${to}: ${info.messageId}`);
  return info;
};

const sendOrderConfirmation = async (order, customer) => {
  await sendEmail({
    to: customer.email,
    subject: `Order Confirmed #${order.orderNumber} — AI Smart Dine`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 30px; border-radius: 12px;">
        <h1 style="color: #10b981;">✅ Order Confirmed!</h1>
        <p>Hi ${customer.name},</p>
        <p>Your order <strong>#${order.orderNumber}</strong> has been confirmed.</p>
        <h3 style="color: #10b981;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${order.items.map(item => `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #333;">${item.name} × ${item.quantity}</td>
              <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #333;">₹${item.totalPrice}</td>
            </tr>
          `).join('')}
        </table>
        <div style="margin-top: 20px; text-align: right;">
          <p>Subtotal: ₹${order.subtotal}</p>
          <p>GST (${order.gstPercentage}%): ₹${order.gstAmount.toFixed(2)}</p>
          <h2 style="color: #10b981;">Total: ₹${order.totalAmount.toFixed(2)}</h2>
        </div>
        <p style="color: #666; margin-top: 30px;">Thank you for dining with us!</p>
        <p style="color: #666;">AI Smart Dine</p>
      </div>
    `,
  });
};

const sendReservationConfirmation = async (reservation, customer) => {
  await sendEmail({
    to: customer.email,
    subject: `Reservation Confirmed #${reservation.reservationNumber} — AI Smart Dine`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 30px; border-radius: 12px;">
        <h1 style="color: #10b981;">🪑 Reservation Confirmed!</h1>
        <p>Hi ${customer.name},</p>
        <p>Your reservation <strong>#${reservation.reservationNumber}</strong> is confirmed.</p>
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>📅 Date: <strong>${new Date(reservation.date).toLocaleDateString('en-IN')}</strong></p>
          <p>⏰ Time: <strong>${reservation.timeSlot}</strong></p>
          <p>👥 Guests: <strong>${reservation.guestCount}</strong></p>
          <p>🪑 Table Type: <strong>${reservation.tableType}</strong></p>
        </div>
        ${reservation.specialRequests ? `<p>Special Requests: ${reservation.specialRequests}</p>` : ''}
        <p style="color: #666;">Please arrive 10 minutes before your reservation time.</p>
        <p style="color: #666;">AI Smart Dine</p>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendOrderConfirmation, sendReservationConfirmation };
