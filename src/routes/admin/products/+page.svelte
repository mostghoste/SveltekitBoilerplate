<script>
	/** @type {import('./$types').PageData} */
	export let data;
	let products = data.products;
	let prices = data.prices;
	let totalCount = data.totalCount;
	let page = data.page;
	let totalPages = data.totalPages;

	function getPricesForProduct(productId) {
		return prices.filter((price) => price.product_id === productId);
	}

	function goToPage(newPage) {
		if (newPage > 0 && newPage <= totalPages) {
			window.location.href = `?page=${newPage}`;
		}
	}
</script>

<h1 class="font-bold">Product Management</h1>

<!-- Pagination Info and Controls (Top) -->
<div class="flex justify-between items-center mb-2">
	<span>Total Products: {totalCount}</span>
	<div class="flex items-center gap-2">
		<button class="btn btn-secondary" disabled={page === 1} on:click={() => goToPage(page - 1)}
			>Previous</button
		>
		<span>Page {page} of {totalPages}</span>
		<button
			class="btn btn-secondary"
			disabled={page === totalPages}
			on:click={() => goToPage(page + 1)}>Next</button
		>
	</div>
</div>

<!-- Form to create a new product -->
<h2 class="font-bold mt-4">Add a New Product</h2>
<form method="post" action="?/createProduct" class="flex gap-2 flex-col p-2 border w-96">
	<div class="flex flex-col gap-1">
		<label for="part_name">Part Name <span class="text-red-500">*</span></label>
		<input class="input input-bordered" type="text" id="part_name" name="part_name" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="part_code">Part Code <span class="text-red-500">*</span></label>
		<input class="input input-bordered" type="text" id="part_code" name="part_code" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="group_name">Group Name</label>
		<input class="input input-bordered" type="text" id="group_name" name="group_name" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="image">Image URL</label>
		<input class="input input-bordered" type="text" id="image" name="image" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="price">Price</label>
		<input class="input input-bordered" type="number" step="0.01" id="price" name="price" />
	</div>
	<button class="btn btn-success" type="submit">Add Product</button>
</form>

<!-- Products Table -->
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
							src={`https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${product.image}`}
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

<!-- Pagination Info and Controls (Bottom) -->
<div class="flex justify-between items-center mt-2">
	<span>Total Products: {totalCount}</span>
	<div class="flex items-center gap-2">
		<button class="btn btn-secondary" disabled={page === 1} on:click={() => goToPage(page - 1)}
			>Previous</button
		>
		<span>Page {page} of {totalPages}</span>
		<button
			class="btn btn-secondary"
			disabled={page === totalPages}
			on:click={() => goToPage(page + 1)}>Next</button
		>
	</div>
</div>
