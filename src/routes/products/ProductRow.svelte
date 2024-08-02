<!-- ProductRow.svelte -->
<script>
	export let Product;
	import { cart } from '$lib/stores/cart';

	// Helper function from the cart store
	const { addToCart } = cart;
</script>

{#if Product}
	<tr>
		<td>
			<div class="flex items-center gap-3">
				<div class="avatar">
					<figure class="w-32 h-32 flex justify-center items-center bg-base-100">
						{#if Product.image}
							<img
								src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{Product.image}"
								alt="{Product.part_name} - {Product.part_code}"
								title="{Product.part_name} - {Product.part_code}"
							/>
						{/if}
					</figure>
				</div>
			</div>
		</td>
		<td>
			<div>
				<div class="font-bold">{Product.part_name}</div>
				<div class="text-sm opacity-50">{Product.part_code}</div>
			</div>
		</td>
		<td>{Product.prices[0]?.price.toFixed(2) ?? 'N/A'}€</td>
		<th class="w-48">
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
				Add to cart</button
			>
		</th>
	</tr>
{/if}
