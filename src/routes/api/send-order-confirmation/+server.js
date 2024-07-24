import { json } from '@sveltejs/kit';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST({ request }) {
  const { email, cart } = await request.json();

  // Prepare the order details to include in the email
  const orderDetails = cart.map((item) =>
    `${item.part_name} (x${item.quantity}) - ${item.price.toFixed(2)}€ each`
  ).join('\n');

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.price, 0).toFixed(2);

  // Sender details
  const senderAddress = process.env.EMAIL_SENDER_ADDRESS;
  const senderName = process.env.EMAIL_SENDER_NAME;
  const salesRecipient = process.env.EMAIL_SALES_RECIPIENT;

  // Send the email to the customer
  try {
    const customerEmailResponse = await resend.emails.send({
      from: `${senderName} <${senderAddress}>`,
      to: [email],
      subject: 'Order Confirmation',
      html: `<strong>Thank you for your order!</strong><br/><br/>
             <strong>Order Details:</strong><br/>${orderDetails.replace(/\n/g, '<br/>')}<br/><br/>
             <strong>Total Amount:</strong> ${totalAmount}€`
    });

    if (customerEmailResponse.error) {
      console.error({ error: customerEmailResponse.error });
      return json({ message: 'Failed to send email to customer' }, { status: 500 });
    }

    // Send the email to the sales recipient
    const salesEmailResponse = await resend.emails.send({
      from: `${senderName} <${senderAddress}>`,
      to: [salesRecipient],
      subject: 'New Order Received',
      html: `<strong>New order received!</strong><br/><br/>
             <strong>Order Details:</strong><br/>${orderDetails.replace(/\n/g, '<br/>')}<br/><br/>
             <strong>Total Amount:</strong> ${totalAmount}€<br/><br/>
             <strong>Customer Contact Information:</strong><br/>${email}`
    });

    if (salesEmailResponse.error) {
      console.error({ error: salesEmailResponse.error });
      return json({ message: 'Failed to send email to sales recipient' }, { status: 500 });
    }

    console.log({ customerEmailResponse, salesEmailResponse });
    return json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return json({ message: 'Failed to send emails' }, { status: 500 });
  }
}
