<script>
	export let Product;
	import { cart } from '$lib/stores/cart';
	import { onMount } from 'svelte';
	import missing from '$lib/assets/images/missing.png';

	let quantity = 0;
	let productInCart = false;

	const { addToCart, updateQuantity, removeFromCart } = cart;

	// Check if the product is in the cart on mount
	onMount(() => {
		const unsubscribe = cart.subscribe((items) => {
			const existingProduct = items.find((item) => item.id === Product.id);
			if (existingProduct) {
				productInCart = true;
				quantity = existingProduct.quantity;
			} else {
				productInCart = false;
				quantity = 0;
			}
		});

		return () => {
			unsubscribe();
		};
	});

	// Handle quantity change
	function handleQuantityChange(event) {
		const newQuantity = parseInt(event.target.value);
		if (newQuantity > 0) {
			quantity = newQuantity;
			updateQuantity(Product.id, quantity);
		} else if (newQuantity === 0) {
			removeFromCart(Product.id);
			productInCart = false;
		}
	}
</script>

{#if Product}
	<tr class="hover">
		<td class="w-32">
			<figure
				class="w-32 h-32 flex justify-center items-center bg-base-100 border rounded-box overflow-clip"
			>
				{#if Product.image}
					<button onclick="modal_product_{Product.id}.showModal()" class="w-full h-full">
						<img
							src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{Product.image}"
							alt="{Product.part_name} - {Product.part_code}"
							title="{Product.part_name} - {Product.part_code}"
						/>
					</button>
				{:else}
					<img
						src={missing}
						alt="{Product.part_name} - {Product.part_code}"
						title="{Product.part_name} - {Product.part_code}"
					/>
				{/if}
			</figure>
		</td>
		<td class="flex-grow">
			<div>
				<div class="font-bold">{Product.part_name}</div>
				<div class="text-sm opacity-50">{Product.part_code}</div>
			</div>
		</td>
		<td class="text-end text-lg font-bold">{Product.prices[0]?.price.toFixed(2) ?? 'N/A'}€</td>
		<th class="w-48 min-w-48 text-center">
			{#if productInCart}
				<input
					type="number"
					min="0"
					value={quantity}
					on:input={handleQuantityChange}
					class="input input-bordered input-sm w-full h-12"
				/>
			{:else}
				<button
					on:click={() => {
						addToCart(Product);
					}}
					class="btn btn-accent btn-sm rounded-btn font-normal text-accent-content"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					Add to cart
				</button>
			{/if}
		</th>
	</tr>

	{#if Product.image}
		<dialog id="modal_product_{Product.id}" class="modal">
			<div class="modal-box">
				<form method="dialog">
					<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
				</form>
				<h3 class="text-lg font-bold">{Product.part_name}</h3>
				<img
					src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{Product.image}"
					alt="{Product.part_name} - {Product.part_code}"
					class="w-full h-auto"
				/>
			</div>
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
	{/if}
{/if}
