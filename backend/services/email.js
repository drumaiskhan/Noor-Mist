const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Email not configured, skipping:', subject);
    return;
  }
  await transporter.sendMail({
    from: `"Noor Mist" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const sendOrderConfirmation = async (order, user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #D4AF37;">Order Confirmed</h1>
      <p>Dear ${user.first_name || 'Customer'},</p>
      <p>Your order <strong>#${order.order_number}</strong> has been placed successfully.</p>
      <p>Total: <strong>₨${order.total_amount}</strong></p>
      <p>We'll notify you when your order ships.</p>
      <p>Thank you for choosing Noor Mist!</p>
    </div>
  `;
  await sendEmail({ to: user.email, subject: `Order Confirmed - #${order.order_number}`, html });
};

module.exports = { sendEmail, sendOrderConfirmation };
