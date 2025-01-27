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
	class="sticky top-[var(--navbar-height)] h-[calc(100vh-var(--navbar-height))] flex flex-col gap-4 p-6 bg-white border-l border-gray-200 min-w-[300px] max-w-[400px] overflow-hidden shadow-lg"
	style="--navbar-height: 120px;"
>
	<h2 class="text-lg font-bold text-gray-800">{m.mano_krepselis || 'Mano krepšelis'}</h2>

	{#if CartProducts?.length > 0}
		<ul class="flex-1 w-full overflow-y-auto">
			{#each CartProducts as product}
				<li class="flex gap-4 items-center border-b pb-2 mb-2">
					<div class="flex items-center gap-2 w-2/3">
						<figure class="w-16 h-16 flex-shrink-0 flex justify-center items-center">
							{#if product.image}
								<img
									src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{product.image}"
									alt="{product.part_name} - {product.part_code}"
									class="max-w-full max-h-full object-contain"
								/>
							{:else}
								<span class="text-sm text-gray-500">No Image</span>
							{/if}
						</figure>
						<div class="flex flex-col overflow-hidden w-full">
							<p class="text-sm font-bold truncate" title={product.part_name}>
								{product.part_name}
							</p>
							<p class="text-sm truncate text-gray-500" title={product.part_code}>
								{product.part_code}
							</p>
						</div>
					</div>
					<div class="w-1/3 flex flex-col items-end">
						{#if product.quantity > 1}
							<span class="text-xs text-gray-500">x{product.quantity}</span>
						{/if}
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
