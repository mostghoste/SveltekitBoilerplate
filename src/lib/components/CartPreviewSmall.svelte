<script>
	import { cart } from '$lib/stores/cart';
	import { sendOrderConfirmation } from '$lib/sendOrderConfirmation';

	// Subscribe to the cart store
	let CartProducts = [];
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	$: total = CartProducts.reduce(
		(sum, product) => sum + product.quantity * product.prices[0]?.price,
		0
	);

	// Helper functions from the cart store
	const { removeFromCart, clearCart } = cart;

	// Function to handle order confirmation
	async function confirmOrder() {
		try {
			const email = 'sarunas969@gmail.com'; // Replace with the customer's email address
			await sendOrderConfirmation(email, CartProducts);
			alert('Order confirmed and email sent!');
			clearCart();
		} catch (error) {
			alert('Failed to send order confirmation email');
			console.error(error);
		}
	}
</script>

<section
	class="border flex flex-col items-center p-2 gap-2 min-h-24 {CartProducts?.length == 0
		? 'justify-center'
		: ''}"
>
	<!-- <header>
		<h2 class="font-bold">Your </h2>
	</header> -->
	{#if CartProducts?.length > 0}
		<ul class="w-full">
			<li class="flex gap-2 items-center border-b font-bold">
				<span class="w-16">Image</span>
				<span class="flex-1">Part Name</span>
				<span class="flex-1">Part Code</span>
				<span>Price</span>
				<span>Quantity</span>
				<span>Total</span>
				<span>Action</span>
			</li>
			{#each CartProducts as product}
				<li class="flex gap-2 items-center border-b justify-evenly">
					<figure class="w-16 h-16 flex justify-center items-center">
						<img
							src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{product.image}"
							alt="{product.part_name} - {product.part_code}"
						/>
					</figure>
					<div class="flex flex-col">
						<p>{product.part_name}</p>
						<p>{product.part_code}</p>
					</div>
					<p>{product.prices[0]?.price.toFixed(2)}€</p>
					<input type="number" min="1" class="w-12 text-center" bind:value={product.quantity} />
					<p>{(product.quantity * product.prices[0]?.price).toFixed(2)}€</p>
					<button class="btn btn-sm btn-warning" on:click={() => removeFromCart(product.id)}
						>Remove</button
					>
				</li>
			{/each}
			<p class="text-end">Cart total: <span>{total.toFixed(2)}€</span></p>
		</ul>
		<footer>
			<button class="btn btn-success" disabled={CartProducts.length <= 0} on:click={confirmOrder}
				>Confirm order</button
			>
			<button class="btn btn-warning" disabled={CartProducts.length <= 0} on:click={clearCart}
				>Clear Cart</button
			>
		</footer>
	{:else}
		<p>Your cart is <strong>empty</strong>!</p>
	{/if}
</section>
