<script>
	/** @type {import('./$types').PageData} */
	export let data;
	let products = data.products;
	let prices = data.prices;

	function getPricesForProduct(productId) {
		return prices.filter((price) => price.product_id === productId);
	}
</script>

<h1 class="font-bold">Product management</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>Product ID</th>
			<th>Image</th>
			<th>Group Name</th>
			<th>Part Name</th>
			<th>Part Code</th>
			<th>Prices by Customer Group</th>
		</tr>
	</thead>
	<tbody>
		{#each products as product}
			<tr>
				<td>{product.id}</td>
				<td>
					{#if product.image}
						<img
							src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{product.image}"
							alt={product.part_name}
							class="w-16 h-16 object-contain"
						/>
					{:else}
						No Image
					{/if}
				</td>
				<td>{product.group_name || 'N/A'}</td>
				<td>{product.part_name || 'N/A'}</td>
				<td>{product.part_code || 'N/A'}</td>
				<td>
					<ul>
						{#each getPricesForProduct(product.id) as price}
							<li>{price.customer_groups.group_name}: ${price.price}</li>
						{/each}
					</ul>
				</td>
			</tr>
		{/each}
	</tbody>
</table>
