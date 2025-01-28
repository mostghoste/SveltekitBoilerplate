<script>
	import { cart } from '$lib/stores/cart';
	import { sendOrderConfirmation } from '$lib/sendOrderConfirmation';
	import { derived } from 'svelte/store';
	import * as m from '$lib/paraglide/messages.js';
	export let user;

	let CartProducts = [];
	let showModal = false;
	let orderStatus = null; // 'success' or 'fail'
	let orderError = '';

	// Reactive cart updates
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	// Total price calculation
	$: total = CartProducts.reduce(
		(sum, product) => sum + product.quantity * product.prices[0]?.price,
		0
	);

	// Derived store for cart validation
	const isCartValid = derived(cart, ($cart) => {
		return $cart.length > 0 && $cart.every((item) => item.quantity > 0);
	});

	// Confirm order function
	async function confirmOrder() {
		try {
			const email = user.email;
			await sendOrderConfirmation(email, CartProducts);
			// If successful, show success state in the modal
			orderStatus = 'success';
		} catch (error) {
			// If failed, stay in the modal and show error
			orderStatus = 'fail';
			orderError = error?.message || 'Įvyko klaida.';
			console.error(error);
		}
	}

	// Confirm clear cart
	function confirmClearCart() {
		if (window.confirm(m.confirm_clear_cart())) {
			cart.clearCart();
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
						on:click={() => cart.removeFromCart(product.id)}
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
							<label for={`quantity-${index}`} class="text-xs text-gray-500"
								>{m.quantity_short()}</label
							>
							<input
								id={`quantity-${index}`}
								type="number"
								min="1"
								class="input input-bordered w-16 text-center input-xs"
								bind:value={product.quantity}
								on:change={(e) =>
									cart.updateQuantity(product.id, Math.max(1, parseInt(e.target.value)))}
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
				disabled={!$isCartValid}
				on:click={() => {
					showModal = true;
					orderStatus = null; // reset status each time we open
					orderError = '';
				}}
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
				class="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
				on:click={() => (showModal = false)}
			>
				X
			</button>
			<!-- {#if true} -->
			{#if orderStatus === 'success'}
				<!-- Success state -->
				<div class="flex flex-col justify-center py-16">
					<h2 class="text-xl font-bold mb-4 text-center">{m.confirm_cart_successful_title()}</h2>
					<p class="mb-4 text-center">
						{m.confirm_cart_successful_p({ email: user.email })}
					</p>
					<div class="flex justify-center">
						<button
							class="btn btn-success"
							on:click={() => {
								cart.clearCart();
								showModal = false;
								orderStatus = null;
							}}
						>
							{m.confirm_cart_continue()}
						</button>
					</div>
				</div>
			{:else}
				<!-- Normal or fail state -->
				<h3 class="text-lg font-bold mb-4">{m.review_your_cart()}</h3>
				{#if CartProducts.length > 0}
					<ul class="overflow-scroll max-h-96">
						{#each CartProducts as product, index}
							<li class="relative flex items-center border-b pb-2 mb-2 mt-4 gap-1">
								<button
									class="btn btn-xs btn-error absolute right-0 -top-2"
									on:click={() => cart.removeFromCart(product.id)}
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
											on:change={(e) =>
												cart.updateQuantity(product.id, Math.max(1, parseInt(e.target.value)))}
										/>
										<p>{product.prices[0]?.price.toFixed(2)}€</p>
									</div>
								</div>
							</li>
						{/each}
					</ul>
					<p class="text-lg font-bold mt-4 text-right">
						{m.cart_total()}
						{total.toFixed(2)}€
					</p>

					{#if orderStatus === 'fail'}
						<!-- Error alert -->
						<div role="alert" class="alert alert-error mt-4">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-6 w-6 shrink-0 stroke-current"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>{@html m.confirm_cart_error({ orderError: orderError })}</span>
						</div>
					{:else}
						<!-- Info alert -->
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
							<span>
								{@html m.order_confirmation_information({ email: `<b>${user.email}</b>` })}
							</span>
						</div>
					{/if}
				{:else}
					<p class="text-center text-gray-500">{m.cart_empty()}</p>
				{/if}

				<div class="flex justify-between mt-4">
					<button class="btn btn-secondary" on:click={() => (showModal = false)}>
						{m.return_to_catalog()}
					</button>
					<button class="btn btn-success" disabled={!$isCartValid} on:click={confirmOrder}>
						{m.confirm()}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
