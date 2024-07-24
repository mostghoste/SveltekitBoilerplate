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

  // Send the email using Resend
  try {
    const { data, error } = await resend.emails.send({
      from: 'Agrobond Wholesale <info@stebetojas.lt>',
      to: [email],
      subject: 'Order Confirmation',
      html: `<strong>Thank you for your order!</strong><br/><br/>
             <strong>Order Details:</strong><br/>${orderDetails.replace(/\n/g, '<br/>')}<br/><br/>
             <strong>Total Amount:</strong> ${totalAmount}€`
    });

    if (error) {
      console.error({ error });
      return json({ message: 'Failed to send email' }, { status: 500 });
    }

    console.log({ data });
    return json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    return json({ message: 'Failed to send email' }, { status: 500 });
  }
}
