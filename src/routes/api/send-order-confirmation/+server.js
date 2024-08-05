import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_SENDER_ADDRESS, EMAIL_SENDER_NAME, EMAIL_SALES_RECIPIENT } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function POST({ request, locals }) {
  try {
    const { email, cart } = await request.json();

    if (!email || !Array.isArray(cart) || cart.length === 0) {
      return json({ message: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = locals.supabase;

    // Fetch user's customer group based on email
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_group_id')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return json({ message: 'User not found' }, { status: 404 });
    }

    const customerGroupId = userProfile.customer_group_id;

    // Verify prices from the database
    const productIds = cart.map(item => item.id);
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, part_name, prices!inner(price, customer_group_id)')
      .in('id', productIds)
      .eq('prices.customer_group_id', customerGroupId);

    if (productError) {
      return json({ message: 'Error verifying product prices' }, { status: 500 });
    }

    // Validate cart prices and calculate total amount
    let totalAmount = 0;
    const verifiedCart = cart.map(item => {
      const product = productData.find(p => p.id === item.id);
      if (!product) {
        throw new Error(`Product ID ${item.id} not found`);
      }

      const priceRecord = product.prices.find(p => p.customer_group_id === customerGroupId);
      if (!priceRecord) {
        throw new Error(`Price not found for product ID ${item.id} and group ID ${customerGroupId}`);
      }

      totalAmount += item.quantity * priceRecord.price;
      return {
        ...item,
        part_name: product.part_name,
        verifiedPrice: priceRecord.price
      };
    });

    totalAmount = totalAmount.toFixed(2); // Format total amount

    // Prepare the order details for the email
    const orderDetails = verifiedCart.map(item =>
      `${item.part_name} (x${item.quantity}) - ${item.verifiedPrice}€ each`
    ).join('\n');

    // Send order confirmation emails
    const customerEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
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

    const salesEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [EMAIL_SALES_RECIPIENT],
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

    return json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error:', error.message);
    return json({ message: 'Failed to process request' }, { status: 500 });
  }
}
