<script>
	import { cart } from '$lib/stores/cart';
	import { sendOrderConfirmation } from '$lib/sendOrderConfirmation';
	import * as m from '$lib/paraglide/messages.js';
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
			alert(m.order_confirmed());
			clearCart();
		} catch (error) {
			alert(m.order_failed());
			console.error(error);
		}
	}

	function confirmClearCart() {
		if (window.confirm(m.confirm_clear_cart())) {
			clearCart();
		}
	}
</script>

<aside
	class="sticky top-[var(--navbar-height)] h-[calc(100vh-var(--navbar-height))] flex flex-col gap-4 p-6 bg-white border-l border-gray-200 min-w-[400px] max-w-[400px] overflow-hidden shadow-lg"
	style="--navbar-height: 120px;"
>
	<h2 class="text-lg font-bold text-gray-800">🛒 {m.my_cart() || 'Mano krepšelis'}</h2>

	{#if CartProducts?.length > 0}
		<ul class="flex-1 w-full overflow-y-auto">
			{#each CartProducts as product, index}
				<li class="relative flex items-center border-b pb-2 mb-2 mt-4 gap-1">
					<!-- Remove Button -->
					<button
						class="btn btn-xs btn-error absolute right-0 -top-2"
						on:click={() => removeFromCart(product.id)}
					>
						X
					</button>

					<!-- Left Section: Image, Name, Part Code -->
					<div class="flex items-center gap-2 w-1/2">
						<figure class="w-16 h-16 flex-shrink-0 flex justify-center items-center">
							{#if product.image}
								<img
									src={`https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${product.image}`}
									alt="{product.part_name} - {product.part_code}"
									class="max-w-full max-h-full object-contain"
								/>
							{:else}
								<img
									src="/src/lib/assets/images/missing.png"
									alt="{product.part_name} - {product.part_code}"
									title="{product.part_name} - {product.part_code}"
									class="max-w-full max-h-full object-contain"
								/>
							{/if}
						</figure>
						<div class="flex flex-col overflow-hidden">
							<p class="text-sm font-bold truncate" title={product.part_name}>
								{product.part_name}
							</p>
							<p class="text-sm truncate text-gray-500" title={product.part_code}>
								{product.part_code}
							</p>
						</div>
					</div>

					<!-- Right Section: Quantity, Price -->
					<div class="flex items-center justify-between gap-4 w-1/2">
						<div class="flex items-center gap-2">
							<label for={`quantity-${index}`} class="text-xs text-gray-500">Kiekis:</label>
							<input
								id={`quantity-${index}`}
								type="number"
								min="1"
								class="input input-bordered w-16 text-center input-xs"
								bind:value={product.quantity}
								on:change={() =>
									cart.update((items) => {
										items[index].quantity = Math.max(1, product.quantity);
										return [...items];
									})}
							/>
						</div>
						<p class="text-gray-900 font-semibold">{product.prices[0]?.price.toFixed(2)}€</p>
					</div>
				</li>
			{/each}
		</ul>
		<p class="text-end mt-4 text-lg font-semibold text-gray-800">
			{m.cart_total()} <strong>{total.toFixed(2)}€</strong>
		</p>
		<footer class="sticky bottom-0 bg-white p-4 border-t border-gray-200 flex flex-col gap-2">
			<button
				class="btn btn-warning btn-sm w-full"
				disabled={CartProducts.length <= 0}
				on:click={confirmClearCart}
			>
				{m.clear_cart()}
			</button>
			<button
				class="btn btn-success btn-sm w-full"
				disabled={CartProducts.length <= 0}
				on:click={confirmOrder}
			>
				{m.checkout()}
			</button>
		</footer>
	{:else}
		<p class="text-gray-500 text-center flex-1 flex items-center justify-center">
			{m.cart_empty()}
		</p>
	{/if}
</aside>
