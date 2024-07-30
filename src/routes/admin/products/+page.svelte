<script>
	import { onMount } from 'svelte';
	export let data;
	$: ({ supabase } = data);

	let productsWithPrices = [];
	let customerGroups = [];
	let totalCount = 0;
	let page = 1;
	let totalPages = 1;
	const limit = 50;

	async function fetchProductsWithPrices(page) {
		try {
			const from = (page - 1) * limit;
			const to = from + limit - 1;

			// Fetch the total count of products
			const { count: totalCountResult, error: countError } = await supabase
				.from('products')
				.select('*', { count: 'exact', head: true });

			if (countError) throw new Error(countError.message);

			totalCount = totalCountResult;
			totalPages = Math.ceil(totalCount / limit);

			// Fetch products with their prices and customer groups
			const { data: productsResult, error: productsError } = await supabase
				.from('products')
				.select(
					`
          id, 
          group_name, 
          part_name, 
          part_code, 
          image,
          prices (
            id,
            price,
            customer_groups (
              id,
              group_name
            )
          )
        `
				)
				.range(from, to);

			if (productsError) throw new Error(productsError.message);

			// Fetch all customer groups to dynamically generate columns
			const { data: customerGroupsResult, error: customerGroupsError } = await supabase
				.from('customer_groups')
				.select('id, group_name');

			if (customerGroupsError) throw new Error(customerGroupsError.message);

			customerGroups = customerGroupsResult;

			// Map prices by customer group id for easy access
			productsWithPrices = productsResult.map((product) => {
				const pricesByGroup = {};
				customerGroups.forEach((group) => {
					const price = product.prices.find((p) => p.customer_groups.id === group.id);
					pricesByGroup[group.id] = price ? price.price : 0; // Default value
				});
				return { ...product, pricesByGroup };
			});

			console.log(JSON.stringify(productsWithPrices[0])); // Log to check data structure
		} catch (error) {
			console.error('Error fetching products:', error);
		}
	}

	function goToPage(newPage) {
		if (newPage > 0 && newPage <= totalPages) {
			page = newPage;
			fetchProductsWithPrices(page);
		}
	}

	onMount(() => {
		fetchProductsWithPrices(page);
	});
</script>

<h1 class="font-bold">Product Management</h1>

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

<!-- Products Table -->
<table class="table w-full">
	<thead>
		<tr>
			<th rowspan="2" class="w-16">Product ID</th>
			<th rowspan="2" class="w-16">Image</th>
			<th rowspan="2" class="w-32">Group Name</th>
			<th rowspan="2" class="w-32">Part Name</th>
			<th rowspan="2" class="w-16 border-r">Part Code</th>
			<th colspan={customerGroups.length} class="text-center">Prices per Group</th>
		</tr>
		<tr>
			{#each customerGroups as group}
				<th class="border-r">{group.group_name}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each productsWithPrices as product}
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
				<td class="border-r">{product.part_code || 'N/A'}</td>
				{#each customerGroups as group}
					<td class="border-r" title="Price for group '{group.group_name}'"
						>{product.pricesByGroup[group.id].toFixed(2)}€</td
					>
				{/each}
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
