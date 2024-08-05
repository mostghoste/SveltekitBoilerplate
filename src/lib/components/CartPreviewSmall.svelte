<script>
	import { cart } from '$lib/stores/cart';
	import { sendOrderConfirmation } from '$lib/sendOrderConfirmation';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	export let user;

	let CartProducts = [];
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	$: total = CartProducts.reduce(
		(sum, product) => sum + product.quantity * product.prices[0]?.price,
		0
	);

	const { removeFromCart, clearCart } = cart;

	async function confirmOrder() {
		try {
			const email = user.email;
			await sendOrderConfirmation(email, CartProducts);
			alert('Order confirmed and email sent!');
			clearCart();
		} catch (error) {
			alert('Failed to send order confirmation email');
			console.error(error);
		}
	}

	function confirmClearCart() {
		if (window.confirm('Are you sure you want to clear the cart?')) {
			clearCart();
		}
	}
</script>

<section
	class="border flex flex-col p-2 gap-2 min-h-24 {CartProducts?.length == 0
		? 'items-center justify-center'
		: ''}"
>
	<p>{m.hello_world()}</p>
	<p>{languageTag()}</p>
	{#if CartProducts?.length > 0}
		<ul class="w-full max-h-96 overflow-y-auto overflow-x-hidden">
			{#each CartProducts as product}
				<li class="flex gap-2 items-center border-b justify-between">
					<div class="flex items-center gap-1 w-2/3">
						<figure class="w-16 h-16 flex-shrink-0 flex justify-center items-center p-1">
							{#if product.image}
								<img
									src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{product.image}"
									alt="{product.part_name} - {product.part_code}"
									class="max-w-full max-h-full object-contain"
								/>
							{:else}
								:D
							{/if}
						</figure>
						<div class="flex flex-col overflow-hidden w-full">
							<p class="text-sm font-bold truncate" title={product.part_name}>
								{product.part_name}
							</p>
							<p class="text-sm truncate" title={product.part_code}>
								{product.part_code}
							</p>
						</div>
					</div>
					<div class="w-1/3 flex flex-col items-end">
						{#if product.quantity > 1}
							<span class="text-xs text-gray-500">x{product.quantity}</span>
						{/if}
						<p>{product.prices[0]?.price.toFixed(2)}€</p>
					</div>
				</li>
			{/each}
		</ul>
		<p class="text-end mt-1">Cart total: <strong>{total.toFixed(2)}€</strong></p>
		<footer class="w-full flex gap-2">
			<button
				class="btn btn-warning btn-sm"
				disabled={CartProducts.length <= 0}
				on:click={confirmClearCart}>Clear Cart</button
			>
			<button
				class="btn btn-success btn-sm flex-grow"
				disabled={CartProducts.length <= 0}
				on:click={confirmOrder}>Checkout</button
			>
		</footer>
	{:else}
		<p>Your cart is <strong>empty</strong>!</p>
	{/if}
</section>
