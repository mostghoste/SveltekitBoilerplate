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

    // Fetch user's customer group and additional details based on email
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_group_id, first_name, last_name, company, phone_number')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return json({ message: 'User not found' }, { status: 404 });
    }

    const { customer_group_id: customerGroupId, first_name, last_name, company, phone_number } = userProfile;

    // Fetch customer group name
    const { data: customerGroup, error: customerGroupError } = await supabase
      .from('customer_groups')
      .select('group_name')
      .eq('id', customerGroupId)
      .single();

    if (customerGroupError || !customerGroup) {
      return json({ message: 'Customer group not found' }, { status: 404 });
    }

    const customerGroupName = customerGroup.group_name;

    // Verify prices from the database
    const productIds = cart.map(item => item.id);
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, part_name, part_code, prices!inner(price, customer_group_id)')
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

      const totalPrice = item.quantity * priceRecord.price;
      totalAmount += totalPrice;
      return {
        ...item,
        part_name: product.part_name,
        part_code: product.part_code,
        verifiedPrice: priceRecord.price,
        totalPrice
      };
    });

    totalAmount = totalAmount.toFixed(2); // Format total amount

    // Get current date and time
    const orderTime = new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });

    // Prepare the order details for the email in a table format
    const orderDetailsTable = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Part Name</th>
            <th>Part Code</th>
            <th>Quantity</th>
            <th>Price Each</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${verifiedCart.map(item => `
            <tr>
              <td>${item.part_name}</td>
              <td>${item.part_code}</td>
              <td>${item.quantity}</td>
              <td>${item.verifiedPrice.toFixed(2)}€</td>
              <td>${item.totalPrice.toFixed(2)}€</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" align="right"><strong>Total Amount:</strong></td>
            <td><strong>${totalAmount}€</strong></td>
          </tr>
        </tbody>
      </table>`;

    // Send order confirmation emails
    const customerEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [email],
      subject: 'Order Confirmation',
      html: `<strong>Thank you for your order!</strong><br/><br/>
             <strong>Order Details:</strong><br/>${orderDetailsTable}
             <br/><br/>
             <strong>Our sales team will contact you shortly.</strong>`
    });

    if (customerEmailResponse.error) {
      console.error({ error: customerEmailResponse.error });
      return json({ message: 'Failed to send email to customer' }, { status: 500 });
    }

    // Append customer details to the sales email
    const customerDetails = `
      <strong>Customer Contact Information:</strong><br/>
      Name: ${first_name || 'N/A'} ${last_name || 'N/A'}<br/>
      Company: ${company || 'N/A'}<br/>
      Email: ${email}<br/>
      Phone Number: ${phone_number || 'N/A'}<br/>
      Customer Group: ${customerGroupName}<br/>
      Order Time: ${orderTime}
    `;

    const salesEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [EMAIL_SALES_RECIPIENT],
      reply_to: email,
      subject: 'New Order Received',
      html: `<strong>New order received!</strong><br/><br/>
             <strong>Order Details:</strong><br/>${orderDetailsTable}<br/><br/>
             ${customerDetails}`
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
