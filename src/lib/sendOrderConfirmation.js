export async function sendOrderConfirmation(email, cart) {
  // Only send necessary data: email and product IDs with quantities
  const cartData = cart.map(item => ({
    id: item.id,
    quantity: item.quantity
  }));

  const response = await fetch('/api/send-order-confirmation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, cart: cartData }),
  });

  if (!response.ok) {
    throw new Error('Failed to send order confirmation email');
  }

  return await response.json();
}
