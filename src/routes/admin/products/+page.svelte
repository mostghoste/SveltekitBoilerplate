<script>
	import { onMount } from 'svelte';
	import PaginationControl from './PaginationControl.svelte';
	import * as m from '$lib/paraglide/messages.js';
	export let data;
	$: ({ supabase } = data);

	let productsWithPrices = [];
	let customerGroups = [];
	let totalCount = 0;
	let page = 1;
	let totalPages = 1;
	const limit = 50;

	// Delete modal state
	let showDeleteModal = false;
	let productToDelete = null;

	// Toast notification state
	let showToast = false;
	let toastMessage = '';
	let toastType = 'success'; // 'success' | 'error' | 'info'

	// Nested category options from server: [{ id, label, depth, isLeaf }]
	let categories = data.categoriesOptions || [];

	// Search fields
	let partNameSearch = '';
	let partCodeSearch = '';

	async function fetchProductsWithPrices(page) {
		try {
			const from = (page - 1) * limit;
			const to = from + limit - 1;

			// Base query (includes joined simple category name for display)
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
				.order('id', { ascending: true })
				.range(from, to);

			// Apply conditional filters
			const trimmedName = partNameSearch.trim();
			const trimmedCode = partCodeSearch.trim();
			if (trimmedName) {
				query = query.ilike('part_name', `%${trimmedName}%`);
			}
			if (trimmedCode) {
				query = query.ilike('part_code', `%${trimmedCode}%`);
			}

			// Fetch the filtered products
			const { data: productsResult, error: productsError } = await query;

			if (productsError) throw new Error(productsError.message);

			// Fetch the total count of products with the same filters
			query = supabase.from('products').select('*', { count: 'exact', head: true });

			// Reapply filters for the count query
			if (trimmedName) {
				query = query.ilike('part_name', `%${trimmedName}%`);
			}
			if (trimmedCode) {
				query = query.ilike('part_code', `%${trimmedCode}%`);
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

			// Update local state + success status
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex][fieldName] = newValue;
				productsWithPrices[productIndex].priceStatus[fieldName] = 'success';
				productsWithPrices = [...productsWithPrices];

				// If category changed, refresh the table (to update the joined category name)
				if (fieldName === 'category_id') {
					fetchProductsWithPrices(page);
				} else {
					setTimeout(() => {
						productsWithPrices[productIndex].priceStatus[fieldName] = '';
						productsWithPrices = [...productsWithPrices];
					}, 3000);
				}
			}
		} catch (error) {
			console.error(`Error updating ${fieldName}:`, error);

			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[fieldName] = 'error';
				productsWithPrices = [...productsWithPrices];
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

			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[groupId] = 'success';
				productsWithPrices = [...productsWithPrices];
				setTimeout(() => {
					productsWithPrices[productIndex].priceStatus[groupId] = '';
					productsWithPrices = [...productsWithPrices];
				}, 3000);
			}
		} catch (error) {
			console.error('Error updating price:', error);
			const productIndex = productsWithPrices.findIndex((p) => p.id === productId);
			if (productIndex !== -1) {
				productsWithPrices[productIndex].priceStatus[groupId] = 'error';
				productsWithPrices = [...productsWithPrices];
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

	async function handleImageUpload(event) {
		const input = event.target;
		const formData = new FormData();
		const productId = input.closest('form').querySelector('input[name="product_id"]').value;
		const file = input.files[0];

		if (file) {
			formData.append('product_id', productId);
			formData.append('image', file);

			try {
				const response = await fetch('?/updateImage', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					fetchProductsWithPrices(page);
				} else {
					console.error('Failed to upload image');
				}
			} catch (error) {
				console.error('Error uploading image:', error);
			}
		}
	}

	function openDeleteModal(product) {
		productToDelete = product;
		showDeleteModal = true;
	}

	function getFullCategoryPath(categoryId) {
		const category = categories.find((cat) => cat.id == categoryId);
		return category ? category.label : 'N/A';
	}

	function closeDeleteModal() {
		productToDelete = null;
		showDeleteModal = false;
	}

	async function confirmDelete() {
		if (!productToDelete) return;

		try {
			// Delete the product from the database
			const { error } = await supabase
				.from('products')
				.delete()
				.eq('id', productToDelete.id);

			if (error) {
				throw new Error(error.message);
			}

			// Success: Show success toast
			showToast = true;
			toastType = 'success';
			toastMessage = m.product_deleted_success({
				product_name: productToDelete.part_name,
				product_id: productToDelete.id
			});

			// Close modal and refresh products list
			closeDeleteModal();
			fetchProductsWithPrices(page);

			// Auto-hide toast after 5 seconds
			setTimeout(() => {
				showToast = false;
			}, 5000);

		} catch (error) {
			console.error('Error deleting product:', error);

			// Error: Show error toast
			showToast = true;
			toastType = 'error';
			toastMessage = m.product_delete_error({
				error_message: error.message || 'Unknown error occurred'
			});

			// Close modal but don't refresh list
			closeDeleteModal();

			// Auto-hide toast after 7 seconds (longer for error)
			setTimeout(() => {
				showToast = false;
			}, 7000);
		}
	}

	function closeToast() {
		showToast = false;
	}
</script>

<h1 class="font-bold">{m.product_management()}</h1>

<!-- Button to open the modal -->
<button class="btn mb-4" on:click={() => document.getElementById('product-modal').showModal()}>
	{m.add_new_product()}
</button>

<!-- Modal -->
<dialog id="product-modal" class="modal">
	<div class="modal-box">
		<form method="dialog">
			<button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
		</form>
		<h3 class="font-bold text-lg">{m.add_new_product()}</h3>
		<form
			method="post"
			action="?/createProduct"
			class="flex gap-2 flex-col p-2"
			enctype="multipart/form-data"
		>
			<div class="flex flex-col gap-1">
				<label for="part_name">{m.part_name()} <span class="text-red-500">*</span></label>
				<input class="input input-bordered" type="text" id="part_name" name="part_name" required />
			</div>
			<div class="flex flex-col gap-1">
				<label for="part_code">{m.part_code()} <span class="text-red-500">*</span></label>
				<input class="input input-bordered" type="text" id="part_code" name="part_code" required />
			</div>
			<div class="flex flex-col gap-1">
				<label for="price">{m.price()} <span class="text-red-500">*</span></label>
				<input
					class="input input-bordered"
					type="number"
					step="0.01"
					id="price"
					name="price"
					required
					placeholder="0.00"
				/>
			</div>
			<div class="flex flex-col gap-1">
				<label for="category_id">{m.category()} <span class="text-red-500">*</span></label>
				<select class="input input-bordered" id="category_id" name="category_id" required>
					<option value="" disabled selected>{m.select_category()}</option>
					{#each categories as cat}
						<!-- visually indent by depth using em-spaces — keep all categories selectable -->
						<option value={cat.id}>
							{Array(cat.depth).fill(' ').join('')}{cat.label}
						</option>
					{/each}
				</select>
			</div>
			<div class="flex flex-col gap-1">
				<label for="image">{m.image_file()}</label>
				<input class="file-input" type="file" id="image" name="image" accept="image/*" />
			</div>

			<button class="btn btn-success" type="submit">{m.add_product()}</button>
		</form>
	</div>
</dialog>

<a class="btn" href="/admin/products/translations">{m.translations()}</a>

<!-- Search Form -->
<form class="flex gap-2 mb-4" on:submit={handleSearch}>
	<input
		type="text"
		class="input input-bordered w-full"
		placeholder={m.search_part_name()}
		bind:value={partNameSearch}
	/>
	<input
		type="text"
		class="input input-bordered w-full"
		placeholder={m.search_part_code()}
		bind:value={partCodeSearch}
	/>
	<button type="submit" class="btn btn-success">{m.search()}</button>
</form>

<!-- Pagination Info and Controls (Top) -->
<PaginationControl {page} {totalPages} {totalCount} {goToPage} />

<!-- Product Details Table -->
<div class="flex w-full">
	<table class="table w-auto">
		<thead>
			<tr>
				<th class="w-16">{m.product_id()}</th>
				<th class="w-16">{m.image()}</th>
				<th class="w-64">{m.category()}</th>
				<th class="w-32">{m.part_name()}</th>
				<th class="w-16 border-r-2 border-r-base-300">{m.part_code()}</th>
			</tr>
		</thead>
		<tbody>
			{#each productsWithPrices as product}
				<tr class="h-24">
					<td class="relative group text-center">
						<span class="group-hover:opacity-50">{product.id}</span>
						<button
							class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-md rounded px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
							on:click={() => openDeleteModal(product)}
							title={m.delete_product()}
						>
							🗑️
						</button>
					</td>
					<td class="relative">
						<form
							action="?/updateImage"
							method="post"
							enctype="multipart/form-data"
							class="w-full h-full absolute inset-0 {product.image ? 'top-4' : ''}"
						>
							<input type="hidden" name="product_id" value={product.id} />
							<input
								type="file"
								name="image"
								accept="image/*"
								class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
								on:change={handleImageUpload}
							/>
							{#if product.image}
								<img
									src={`https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${product.image}`}
									alt={product.part_name}
									class="w-16 h-16 object-contain"
								/>
							{:else}
								<span class="flex items-center justify-center w-full h-full"> {m.no_image()} </span>
							{/if}
						</form>
					</td>
					<td>
						<select
							class="input input-bordered {getStatusClass(product.priceStatus['category_id'])} w-64"
							bind:value={product.category_id}
							on:change={(event) => updateField(product.id, 'category_id', event.target.value)}
						>
							<option value="" disabled>{m.select_category()}</option>
							{#each categories as cat}
								<option value={cat.id}>
									{Array(cat.depth).fill(' ').join('')}{cat.label}
								</option>
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
					<td class="border-r-2 border-r-base-300">
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
<PaginationControl {page} {totalPages} {totalCount} {goToPage} />

<!-- Delete Confirmation Modal -->
{#if showDeleteModal && productToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
			<h3 class="font-bold text-lg mb-4">{m.delete_product()}</h3>
			<p class="mb-4">{m.confirm_delete_product()}</p>

			<!-- Product Info Display -->
			<div class="bg-gray-100 p-4 rounded mb-4">
				<div class="flex gap-4">
					<!-- Product Image -->
					<div class="flex-shrink-0">
						{#if productToDelete.image}
							<img
								src={`https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/${productToDelete.image}`}
								alt={productToDelete.part_name}
								class="w-48 h-48 object-contain rounded border"
							/>
						{:else}
							<div
								class="w-48 h-48 bg-gray-300 rounded border flex items-center justify-center text-base text-gray-500"
							>
								{m.no_image()}
							</div>
						{/if}
					</div>
					<!-- Product Details -->
					<div class="flex-1">
						<p><strong>{m.product_id()}:</strong> {productToDelete.id}</p>
						<p><strong>{m.part_name()}:</strong> {productToDelete.part_name}</p>
						<p><strong>{m.part_code()}:</strong> {productToDelete.part_code}</p>
						<p>
							<strong>{m.category()}:</strong>
							{getFullCategoryPath(productToDelete.category_id)}
						</p>
					</div>
				</div>
			</div>

			<div class="flex justify-end gap-2">
				<button class="btn btn-ghost" on:click={closeDeleteModal}>
					{m.cancel()}
				</button>
				<button class="btn btn-error" on:click={confirmDelete}>
					{m.delete_product()}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast Notification -->
{#if showToast}
	<div class="fixed top-20 right-4 z-50 max-w-md">
		<div class="alert alert-{toastType} shadow-lg {toastType === 'success' ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'}">
			<div class="flex items-center justify-between w-full">
				<div class="flex items-center gap-2">
					{#if toastType === 'success'}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{:else if toastType === 'error'}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					{/if}
					<span class="text-sm">{@html toastMessage}</span>
				</div>
				<button class="btn btn-sm btn-ghost" on:click={closeToast}>
					✕
				</button>
			</div>
		</div>
	</div>
{/if}
