import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { RESEND_API_KEY, EMAIL_SENDER_ADDRESS, EMAIL_SENDER_NAME, EMAIL_SALES_RECIPIENT } from '$env/static/private';

const translations = {
  en: {
    email: {
      // For Customer Email
      intro: "Thank you for your order!",
      order_details: "Order Details",
      total: "Total Amount",
      customer_subject: "Order Confirmation",
      footer: "Our sales team will contact you shortly.",

      // *If* you ever needed an English version for the sales team, you could add them:
      sales_subject: "New Order Received",
      table_part_name: "Part Name",
      table_part_code: "Part Code",
      table_quantity: "Quantity",
      table_price_each: "Price Each",
      sales_intro: "New order received!",
      customer_info_title: "Customer Contact Information:",
      name_label: "Name",
      company_label: "Company",
      email_label: "Email",
      phone_label: "Phone Number",
      group_label: "Customer Group",
      order_time_label: "Order Time"
    }
  },
  lt: {
    email: {
      // For Customer Email
      intro: "Jūsų užsakymas sėkmingai patvirtintas!",
      order_details: "Užsakymo krepšelis:",
      total: "Bendra Suma",
      customer_subject: "Užsakymo Patvirtinimas",
      footer: "Agrobond pardavimų komanda netrukus su jumis susisieks.",

      // For Sales Email (always Lithuanian)
      sales_subject: "Naujas užsakymas",
      table_part_name: "Prekės pavadinimas",
      table_part_code: "Prekės kodas",
      table_quantity: "Kiekis",
      table_price_each: "Kaina vnt.",
      sales_intro: "Naujas užsakymas gautas!",
      customer_info_title: "Kliento kontaktinė informacija:",
      name_label: "Vardas",
      company_label: "Įmonė",
      email_label: "El. paštas",
      phone_label: "Telefono numeris",
      group_label: "Kliento grupė",
      order_time_label: "Užsakymo laikas"
    }
  },
  uk: {
    email: {
      // For Customer Email
      intro: "Дякуємо за ваше замовлення!",
      order_details: "Деталі замовлення",
      total: "Загальна сума",
      customer_subject: "Підтвердження замовлення",
      footer: "Наша команда з продажу скоро зв'яжеться з вами.",

      // (If you need them in Ukrainian, add them below)
      sales_subject: "Новий отриманий заказ",
      table_part_name: "Назва товару",
      table_part_code: "Код товару",
      table_quantity: "Кількість",
      table_price_each: "Ціна за шт.",
      sales_intro: "Новий заказ отримано!",
      customer_info_title: "Контактна інформація клієнта:",
      name_label: "Ім'я",
      company_label: "Компанія",
      email_label: "Ел. пошта",
      phone_label: "Номер телефону",
      group_label: "Група клієнтів",
      order_time_label: "Час замовлення"
    }
  }
};

const resend = new Resend(RESEND_API_KEY);

export async function POST({ request, locals }) {
  try {
    const { email, cart, language } = await request.json();

    // Customer translation based on language or fallback to English
    const t = translations[language] || translations.en;
    // Sales translation is ALWAYS Lithuanian
    const tSales = translations.lt;

    if (!email || !Array.isArray(cart) || cart.length === 0) {
      return json({ message: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = locals.supabase;

    // 1) Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_group_id, first_name, last_name, company, phone_number')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return json({ message: 'User not found' }, { status: 404 });
    }

    const { customer_group_id: customerGroupId, first_name, last_name, company, phone_number } = userProfile;

    // 2) Fetch customer group
    const { data: customerGroup, error: customerGroupError } = await supabase
      .from('customer_groups')
      .select('group_name')
      .eq('id', customerGroupId)
      .single();

    if (customerGroupError || !customerGroup) {
      return json({ message: 'Customer group not found' }, { status: 404 });
    }

    const customerGroupName = customerGroup.group_name;

    // 3) Fetch product prices and validate them
    const productIds = cart.map(item => item.id);
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, part_name, part_code, prices!inner(price, customer_group_id)')
      .in('id', productIds)
      .eq('prices.customer_group_id', customerGroupId);

    if (productError) {
      return json({ message: 'Error verifying product prices' }, { status: 500 });
    }

    // 4) Validate cart prices and calculate total
    let totalAmount = 0;
    const verifiedCart = cart.map(item => {
      const product = productData.find(p => p.id === item.id);
      if (!product) {
        throw new Error(`Product ID ${item.id} not found`);
      }

      const priceRecord = product.prices.find(
        p => p.customer_group_id === customerGroupId
      );
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

    // 5) Date/time (UTC)
    const orderTime = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      timeZoneName: 'short'
    });

    // 6) Build the table for the Customer Email (localized)
    const orderDetailsTableCustomer = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>${t.email.table_part_name || 'Part Name'}</th>
            <th>${t.email.table_part_code || 'Part Code'}</th>
            <th>${t.email.table_quantity || 'Quantity'}</th>
            <th>${t.email.table_price_each || 'Price Each'}</th>
            <th>${t.email.total}</th>
          </tr>
        </thead>
        <tbody>
          ${verifiedCart
            .map(
              item => `
            <tr>
              <td>${item.part_name}</td>
              <td>${item.part_code}</td>
              <td>${item.quantity}</td>
              <td>${item.verifiedPrice.toFixed(2)}€</td>
              <td>${item.totalPrice.toFixed(2)}€</td>
            </tr>
          `
            )
            .join('')}
          <tr>
            <td colspan="4" align="right"><strong>${t.email.total}:</strong></td>
            <td><strong>${totalAmount}€</strong></td>
          </tr>
        </tbody>
      </table>`;

    // 7) Build the table for the Sales Email (always Lithuanian)
    const orderDetailsTableSales = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>${tSales.email.table_part_name}</th>
            <th>${tSales.email.table_part_code}</th>
            <th>${tSales.email.table_quantity}</th>
            <th>${tSales.email.table_price_each}</th>
            <th>${tSales.email.total}</th>
          </tr>
        </thead>
        <tbody>
          ${verifiedCart
            .map(
              item => `
            <tr>
              <td>${item.part_name}</td>
              <td>${item.part_code}</td>
              <td>${item.quantity}</td>
              <td>${item.verifiedPrice.toFixed(2)}€</td>
              <td>${item.totalPrice.toFixed(2)}€</td>
            </tr>
          `
            )
            .join('')}
          <tr>
            <td colspan="4" align="right"><strong>${tSales.email.total}:</strong></td>
            <td><strong>${totalAmount}€</strong></td>
          </tr>
        </tbody>
      </table>`;

    // 8) Send the Customer Email (localized)
    const customerEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [email],
      subject: t.email.customer_subject,
      html: `
        <strong>${t.email.intro}</strong><br/><br/>
        <strong>${t.email.order_details}:</strong><br/>
        ${orderDetailsTableCustomer}
        <br/><br/>
        <strong>${t.email.footer}</strong>
      `
    });

    if (customerEmailResponse?.error) {
      console.error({ error: customerEmailResponse.error });
      return json({ message: 'Failed to send email to customer' }, { status: 500 });
    }

    // 9) Prepare the Sales Email (always Lithuanian)
    const customerDetailsSales = `
      <strong>${tSales.email.customer_info_title}</strong><br/>
      ${tSales.email.name_label} ${first_name || 'N/A'} ${last_name || 'N/A'}<br/>
      ${tSales.email.company_label} ${company || 'N/A'}<br/>
      ${tSales.email.email_label} ${email}<br/>
      ${tSales.email.phone_label} ${phone_number || 'N/A'}<br/>
      ${tSales.email.group_label} ${customerGroupName}<br/>
      ${tSales.email.order_time_label} ${orderTime}
    `;

    const salesEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [EMAIL_SALES_RECIPIENT],
      reply_to: email,
      subject: tSales.email.sales_subject + " (" + email + ")",
      html: `
        <strong>${tSales.email.sales_intro}</strong><br/><br/>
        <strong>${tSales.email.order_details}:</strong><br/>
        ${orderDetailsTableSales}
        <br/><br/>
        ${customerDetailsSales}
      `
    });

    if (salesEmailResponse?.error) {
      console.error({ error: salesEmailResponse.error });
      return json({ message: 'Failed to send email to sales recipient' }, { status: 500 });
    }

    return json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Error:', error.message);
    return json({ message: 'Failed to process request' }, { status: 500 });
  }
}
