// src/routes/api/order/+server.js (for example)
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import {
  RESEND_API_KEY,
  EMAIL_SENDER_ADDRESS,
  EMAIL_SENDER_NAME,
  EMAIL_SALES_RECIPIENT
} from '$env/static/private';

const translations = {
  en: {
    email: {
      // For Customer Email
      greeting: "Dear Partner,<br/><br/>Thank you for your order!<br/>Our sales team will contact you shortly.",
      order_details: "Order Details",
      table_part_name: "Part Name",
      table_part_code: "Part Code",
      table_quantity: "Quantity",
      table_price_each: "Unit price ex. VAT",
      table_amount_ex_vat: "Amount ex. VAT",
      table_total_ex_vat: "Total amount ex. VAT",
      if_questions: "If you have any questions, please contact your sales manager.",
      signature: "Sincerely,<br/>AGROBOND team",
      customer_subject: "Order Confirmation"
    }
  },
  lt: {
    email: {
      // For Customer Email
      greeting: "Laba diena,<br/><br/>Jūsų užsakymas gautas!<br/>Susisieksime su jumis artimiausiu metu.",
      order_details: "Užsakytos prekės",
      table_part_name: "Prekės pavadinimas",
      table_part_code: "Prekės kodas",
      table_quantity: "Kiekis",
      table_price_each: "Vieneto kaina be PVM",
      table_amount_ex_vat: "Suma be PVM",
      table_total_ex_vat: "Bendra suma be PVM",
      if_questions: "Jei turite klausimų, prašome kreiptis į jūsų aptarnaujantį pardavimų vadybininką.",
      signature: "Pagarbiai,<br/>AGROBOND komanda",
      customer_subject: "Užsakymo Patvirtinimas",

      // For Sales Email (always Lithuanian)
      sales_subject: "Naujas užsakymas",
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
  // NOTE: The screenshot text is actually Russian, 
  // but if you still want to call it "uk" in code, you can keep it that way:
  ru: {
    email: {
      greeting: "Добрый день,<br/><br/>Спасибо за заказ!<br/>С вами свяжемся в ближайшее время.",
      order_details: "Заказанный товар",
      table_part_name: "Наименование товара",
      table_part_code: "Код товара",
      table_quantity: "Количество",
      table_price_each: "Цена за единицу без НДС",
      table_amount_ex_vat: "Сумма без НДС",
      table_total_ex_vat: "Общая сумма без НДС",
      if_questions: "Пожалуйста, обращайтесь к вашему менеджеру по продажам, если у вас есть вопросы.",
      signature: "С уважением,<br/>Команда AGROBOND",
      customer_subject: "Підтвердження замовлення", // or whatever subject you prefer

      // If you also want a "sales" version in Russian, add keys here.
      sales_subject: "Новый заказ",
      sales_intro: "Новый заказ получен!",
      customer_info_title: "Контактная информация клиента:",
      name_label: "Имя",
      company_label: "Компания",
      email_label: "Эл. почта",
      phone_label: "Номер телефона",
      group_label: "Группа клиента",
      order_time_label: "Время заказа"
    }
  }
};

const resend = new Resend(RESEND_API_KEY);

export async function POST({ request, locals }) {
  try {
    const { email, cart, language } = await request.json();

    // 1) Pick the correct translations or default to English
    const t = translations[language]?.email || translations.en.email;
    // 2) Sales translation is ALWAYS Lithuanian
    const tSales = translations.lt.email;

    if (!email || !Array.isArray(cart) || cart.length === 0) {
      return json({ message: 'Invalid request payload' }, { status: 400 });
    }

    const supabase = locals.supabase;

    // 3) Fetch user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('customer_group_id, first_name, last_name, company, phone_number')
      .eq('email', email)
      .single();

    if (profileError || !userProfile) {
      return json({ message: 'User not found' }, { status: 404 });
    }

    const {
      customer_group_id: customerGroupId,
      first_name,
      last_name,
      company,
      phone_number
    } = userProfile;

    // 4) Fetch customer group
    const { data: customerGroup, error: customerGroupError } = await supabase
      .from('customer_groups')
      .select('group_name')
      .eq('id', customerGroupId)
      .single();

    if (customerGroupError || !customerGroup) {
      return json({ message: 'Customer group not found' }, { status: 404 });
    }

    const customerGroupName = customerGroup.group_name;

    // 5) Fetch product prices
    const productIds = cart.map((item) => item.id);
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, part_name, part_code, prices!inner(price, customer_group_id)')
      .in('id', productIds)
      .eq('prices.customer_group_id', customerGroupId);

    if (productError) {
      return json({ message: 'Error verifying product prices' }, { status: 500 });
    }

    // 6) Validate and calculate
    let totalAmount = 0;
    const verifiedCart = cart.map((item) => {
      const product = productData.find((p) => p.id === item.id);
      if (!product) {
        throw new Error(`Product ID ${item.id} not found`);
      }

      const priceRecord = product.prices.find(
        (p) => p.customer_group_id === customerGroupId
      );
      if (!priceRecord) {
        throw new Error(
          `Price not found for product ID ${item.id} and group ID ${customerGroupId}`
        );
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

    totalAmount = totalAmount.toFixed(2);

    // 7) Date/time (UTC)
    const orderTime = new Date().toLocaleString('en-US', {
      timeZone: 'UTC',
      timeZoneName: 'short'
    });

    // 8) Build the table for the Customer Email
    const orderDetailsTableCustomer = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>${t.table_part_name}</th>
            <th>${t.table_part_code}</th>
            <th>${t.table_quantity}</th>
            <th>${t.table_price_each}</th>
            <th>${t.table_amount_ex_vat}</th>
          </tr>
        </thead>
        <tbody>
          ${verifiedCart
            .map(
              (item) => `
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
            <td colspan="4" align="right"><strong>${t.table_total_ex_vat}:</strong></td>
            <td><strong>${totalAmount}€</strong></td>
          </tr>
        </tbody>
      </table>`;

    // 9) Build the Customer Email HTML
    const customerEmailHTML = `
      ${t.greeting}<br/><br/>
      <strong>${t.order_details}:</strong><br/>
      ${orderDetailsTableCustomer}
      <br/><br/>
      ${t.if_questions}<br/><br/>
      ${t.signature}
    `;

    // 10) Send the Customer Email
    const customerEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [email],
      subject: t.customer_subject,
      html: customerEmailHTML
    });

    if (customerEmailResponse?.error) {
      console.error({ error: customerEmailResponse.error });
      return json({ message: 'Failed to send email to customer' }, { status: 500 });
    }

    // 11) Build the table for the Sales Email (always Lithuanian)
    const orderDetailsTableSales = `
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>${tSales.table_part_name}</th>
            <th>${tSales.table_part_code}</th>
            <th>${tSales.table_quantity}</th>
            <th>${tSales.table_price_each}</th>
            <th>${tSales.table_amount_ex_vat}</th>
          </tr>
        </thead>
        <tbody>
          ${verifiedCart
            .map(
              (item) => `
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
            <td colspan="4" align="right"><strong>${tSales.table_total_ex_vat}:</strong></td>
            <td><strong>${totalAmount}€</strong></td>
          </tr>
        </tbody>
      </table>`;

    // 12) Build the Sales Email
    const customerDetailsSales = `
      <strong>${tSales.customer_info_title}</strong><br/>
      ${tSales.name_label}: ${first_name || 'N/A'} ${last_name || 'N/A'}<br/>
      ${tSales.company_label}: ${company || 'N/A'}<br/>
      ${tSales.email_label}: ${email}<br/>
      ${tSales.phone_label}: ${phone_number || 'N/A'}<br/>
      ${tSales.group_label}: ${customerGroupName}<br/>
      ${tSales.order_time_label}: ${orderTime}
    `;

    const salesEmailHTML = `
      <strong>${tSales.sales_intro}</strong><br/><br/>
      <strong>${tSales.order_details}:</strong><br/>
      ${orderDetailsTableSales}
      <br/><br/>
      ${customerDetailsSales}
    `;

    // 13) Send the Sales Email
    const salesEmailResponse = await resend.emails.send({
      from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
      to: [EMAIL_SALES_RECIPIENT],
      reply_to: email,
      subject: tSales.sales_subject + " (" + email + ")",
      html: salesEmailHTML
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
