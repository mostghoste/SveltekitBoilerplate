export async function sendOrderConfirmation(email, cart) {
    const response = await fetch('/api/send-order-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, cart }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to send order confirmation email');
    }
  
    return await response.json();
  }
  