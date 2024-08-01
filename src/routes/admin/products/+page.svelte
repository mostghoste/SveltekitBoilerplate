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
	const categories = data.categories || [];

	// Search fields
	let partNameSearch = '';
	let partCodeSearch = '';

	async function fetchProductsWithPrices(page) {
		try {
			const from = (page - 1) * limit;
			const to = from + limit - 1;

			// Base query
			let query = supabase
				.from('products')
				.select(
					`
					id,
					category_id,
					part_name,
					part_code,
					image,
					categories(category_name),
					prices(price, customer_group_id)
				`
				)
				.range(from, to);

			// Apply conditional filters
			if (partNameSearch) {
				query = query.ilike('part_name', `%${partNameSearch}%`);
			}
			if (partCodeSearch) {
				query = query.ilike('part_code', `%${partCodeSearch}%`);
			}

			// Fetch the filtered products
			const { data: productsResult, error: productsError } = await query;

			if (productsError) throw new Error(productsError.message);

			// Fetch the total count of products with the same filters
			query = supabase.from('products').select('*', { count: 'exact', head: true });

			// Reapply filters for the count query
			if (partNameSearch) {
				query = query.ilike('part_name', `%${partNameSearch}%`);
			}
			if (partCodeSearch) {
				query = query.ilike('part_code', `%${partCodeSearch}%`);
			}

			const { count: totalCountResult, error: countError } = await query;

			if (countError) throw new Error(countError.message);

			totalCount = totalCountResult;
			totalPages = Math.ceil(totalCount / limit);

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
					const priceObj = product.prices.find((p) => p.customer_group_id === group.id);
					pricesByGroup[group.id] = priceObj ? priceObj.price : 0; // Default value
				});
				return { ...product, pricesByGroup, priceStatus: {} };
			});
		} catch (error) {
			console.error('Error fetching products:', error);
		}
	}

	async function updateField(productId, fieldName, newValue) {
		try {
			const { error } = await supabase
				.from('products')
				.update({ [fieldName]: newValue })
				.eq('id', productId);

			if (error) throw new Error(error.message);

			// Update the local state
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex][fieldName] = newValue;
				productsWithPrices[productIndex].priceStatus[fieldName] = 'success';
				productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity

				// Reset status after 3 seconds
				setTimeout(() => {
					productsWithPrices[productIndex].priceStatus[fieldName] = '';
					productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity
				}, 3000);
			}
		} catch (error) {
			console.error(`Error updating ${fieldName}:`, error);

			// Set error status
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[fieldName] = 'error';
				productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity
			}
		}
	}

	async function updatePrice(productId, groupId, newPrice) {
		try {
			const { error } = await supabase
				.from('prices')
				.update({ price: parseFloat(newPrice) })
				.match({ product_id: productId, customer_group_id: groupId });

			if (error) throw new Error(error.message);

			// Set success status
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[groupId] = 'success';
				productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity

				// Reset status after 3 seconds
				setTimeout(() => {
					productsWithPrices[productIndex].priceStatus[groupId] = '';
					productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity
				}, 3000);
			}
		} catch (error) {
			console.error('Error updating price:', error);

			// Set error status
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[groupId] = 'error';
				productsWithPrices = [...productsWithPrices]; // Reassign to trigger reactivity
			}
		}
	}

	function getStatusClass(status) {
		if (status === 'success') return 'border-green-500';
		if (status === 'error') return 'border-red-500';
		return '';
	}

	function goToPage(newPage) {
		if (newPage > 0 && newPage <= totalPages) {
			page = newPage;
			fetchProductsWithPrices(page);
		}
	}

	function handleSearch(event) {
		event.preventDefault();
		fetchProductsWithPrices(1);
	}

	onMount(() => {
		fetchProductsWithPrices(page);
	});
</script>

<h1 class="font-bold">Product Management</h1>

<!-- Form to create a new product -->
<h2 class="font-bold mt-4">Add a New Product</h2>
<form
	method="post"
	action="?/createProduct"
	class="flex gap-2 flex-col p-2 border w-96"
	enctype="multipart/form-data"
>
	<div class="flex flex-col gap-1">
		<label for="part_name">Part Name <span class="text-red-500">*</span></label>
		<input class="input input-bordered" type="text" id="part_name" name="part_name" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="part_code">Part Code <span class="text-red-500">*</span></label>
		<input class="input input-bordered" type="text" id="part_code" name="part_code" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="category_id">Category</label>
		<select class="input input-bordered" id="category_id" name="category_id" required>
			<option value="" disabled selected>Select a category</option>
			{#each categories as category}
				<option value={category.id}>{category.category_name}</option>
			{/each}
		</select>
	</div>
	<div class="flex flex-col gap-1">
		<label for="image">Image File</label>
		<input class="file-input" type="file" id="image" name="image" accept="image/*" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="price">Price</label>
		<input class="input input-bordered" type="number" step="0.01" id="price" name="price" />
	</div>
	<button class="btn btn-success" type="submit">Add Product</button>
</form>

<!-- Search Form -->
<form class="flex gap-2 mt-4" on:submit={handleSearch}>
	<input
		type="text"
		class="input input-bordered w-full"
		placeholder="Search Part Name"
		bind:value={partNameSearch}
	/>
	<input
		type="text"
		class="input input-bordered w-full"
		placeholder="Search Part Code"
		bind:value={partCodeSearch}
	/>
	<button type="submit" class="btn btn-primary">Search</button>
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

<!-- Product Details Table -->
<div class="flex w-full">
	<table class="table w-auto">
		<thead>
			<tr>
				<th class="w-16">Product ID</th>
				<th class="w-16">Image</th>
				<th class="w-32">Category</th>
				<th class="w-32">Part Name</th>
				<th class="w-16 border-r border-black">Part Code</th>
			</tr>
		</thead>
		<tbody>
			{#each productsWithPrices as product}
				<tr class="h-24">
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
					<td>
						<select
							class="input input-bordered {getStatusClass(product.priceStatus['category_id'])}"
							bind:value={product.category_id}
							on:change={(event) => updateField(product.id, 'category_id', event.target.value)}
						>
							<option value="" disabled>Select a category</option>
							{#each categories as category}
								<option value={category.id}>{category.category_name}</option>
							{/each}
						</select>
					</td>
					<td>
						<input
							class="input input-bordered {getStatusClass(product.priceStatus['part_name'])}"
							type="text"
							value={product.part_name}
							on:change={(event) => updateField(product.id, 'part_name', event.target.value)}
						/>
					</td>
					<td class="border-r border-black">
						<input
							class="input input-bordered {getStatusClass(product.priceStatus['part_code'])}"
							type="text"
							value={product.part_code}
							on:change={(event) => updateField(product.id, 'part_code', event.target.value)}
						/>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- Prices per Group Table -->
	<div class="overflow-x-auto">
		<table class="table w-full">
			<thead>
				<tr>
					{#each customerGroups as group}
						<th class="border-r">{group.group_name}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each productsWithPrices as product}
					<tr class="h-24">
						{#each customerGroups as group}
							<td class="border-r">
								<input
									class="input input-bordered max-w-28 {getStatusClass(
										product.priceStatus[group.id]
									)}"
									type="number"
									step="0.01"
									value={product.pricesByGroup[group.id]}
									on:change={(event) => updatePrice(product.id, group.id, event.target.value)}
								/>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

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
