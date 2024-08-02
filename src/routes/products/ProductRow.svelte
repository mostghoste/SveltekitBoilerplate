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
		<th>
			<button
				on:click={() => {
					addToCart(Product);
				}}
				class="btn btn-accent btn-sm rounded-btn">Add to cart</button
			>
		</th>
	</tr>
{/if}
