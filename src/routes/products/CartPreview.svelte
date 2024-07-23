<script>
	import { cart } from '../stores/cart';

	// Subscribe to the cart store
	let CartProducts = [];
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	$: total = CartProducts.reduce((sum, product) => sum + product.quantity * product.price, 0);

	// Helper functions from the cart store
	const { removeFromCart, clearCart } = cart;
</script>

<section class="border flex flex-col items-center p-2 gap-2">
	<header>
		<h2 class="font-bold">Cart</h2>
	</header>
	{#if CartProducts && CartProducts.length > 0}
		<ul class="w-full">
			{#each CartProducts as product}
				<li class="flex gap-2 items-center border">
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
					<p>{product.price.toFixed(2)}€</p>
					<p>{product.quantity}</p>
					<p>{(product.quantity * product.price).toFixed(2)}€</p>
					<button class="btn btn-sm btn-warning" on:click={() => removeFromCart(product.id)}
						>Remove</button
					>
				</li>
			{/each}
			<p>Cart total: <span>{total.toFixed(2)}€</span></p>
		</ul>
	{:else}
		<p>Your cart is empty</p>
	{/if}
	<footer>
		<button class="btn btn-success" on:click={clearCart}>Confirm order</button>
		<button class="btn btn-warning" on:click={clearCart}>Clear Cart</button>
	</footer>
</section>
