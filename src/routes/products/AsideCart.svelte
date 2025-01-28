<script>
	import { cart } from '$lib/stores/cart';
	import { sendOrderConfirmation } from '$lib/sendOrderConfirmation';
	import * as m from '$lib/paraglide/messages.js';
	export let user;

	let CartProducts = [];
	let showModal = false;

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
			showModal = false;
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
				on:click={() => (showModal = true)}
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

<!-- Modal -->
{#if showModal}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
		on:click={() => (showModal = false)}
	>
		<div class="bg-white p-6 rounded-lg shadow-lg w-3/4 max-w-xl relative" on:click|stopPropagation>
			<button
				class="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
				on:click={() => (showModal = false)}
			>
				X
			</button>
			<h3 class="text-lg font-bold mb-4">{m.review_your_cart()}</h3>
			{#if CartProducts.length > 0}
				<ul class="overflow-scroll max-h-96">
					{#each CartProducts as product, index}
						<li class="relative flex items-center border-b pb-2 mb-2 mt-4 gap-1">
							<button
								class="btn btn-xs btn-error absolute right-0 -top-2"
								on:click={() => removeFromCart(product.id)}
							>
								X
							</button>
							<div class="flex items-center justify-between gap-4 w-full">
								<figure class="w-16 h-16 flex-shrink-0 flex justify-center items-center">
									<img
										src={`https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${product.image}`}
										alt="{product.part_name} - {product.part_code}"
										class="max-w-full max-h-full object-contain"
									/>
								</figure>
								<div class="flex-1">
									<p class="text-sm font-bold truncate">{product.part_name}</p>
									<p class="text-sm truncate text-gray-500">{product.part_code}</p>
								</div>
								<div class="flex items-center gap-2">
									<input
										type="number"
										class="input input-bordered w-16 text-center input-xs"
										bind:value={product.quantity}
										min="1"
										on:change={() =>
											cart.update((items) => {
												items[index].quantity = Math.max(1, product.quantity);
												return [...items];
											})}
									/>
									<p>{product.prices[0]?.price.toFixed(2)}€</p>
								</div>
							</div>
						</li>
					{/each}
				</ul>
				<p class="text-lg font-bold mt-4 text-right">{m.cart_total()} {total.toFixed(2)}€</p>
				<div role="alert" class="alert alert-info mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="h-6 w-6 shrink-0 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<span
						>Patvirtinus užsakymą, gausite užsakymo patvirtinimą el. paštu <b>{user.email}.</b> Apie
						užsakymą bus informuotas Agrobond atstovas, kuris su jumis kuo greičiau susisieks.</span
					>
				</div>
				<div class="flex justify-between mt-4">
					<button class="btn btn-secondary" on:click={() => (showModal = false)}
						>Grįžti į katalogą</button
					>
					<button class="btn btn-success" on:click={confirmOrder}>Tvirtinti</button>
				</div>
			{:else}
				<p class="text-center text-gray-500">{m.cart_empty()}</p>
				<button class="btn btn-secondary mt-4 mx-auto" on:click={() => (showModal = false)}>
					Grįžti į katalogą
				</button>
			{/if}
		</div>
	</div>
{/if}
