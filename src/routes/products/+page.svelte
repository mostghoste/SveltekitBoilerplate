<script>
	import CartPreview from '$lib/components/CartPreview.svelte';
	import ProductCard from './ProductCard.svelte';
	import { onMount } from 'svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, categories } = data);

	let products = [];
	let customerGroupId = data.customerGroupId;
	let page = 1;
	const limit = 30;
	let totalPages = 1;
	let totalCount = 0;
	let selectedCategoryId = null; // Track the selected category

	async function fetchProducts(page) {
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		let query = supabase
			.from('products')
			.select(
				'id, image, part_code, part_name, category_id, categories(category_name), prices(price)',
				{ count: 'exact' }
			)
			.eq('prices.customer_group_id', customerGroupId)
			.range(from, to);

		if (selectedCategoryId) {
			query = query.eq('category_id', selectedCategoryId);
		}

		const { data: productData, error, count } = await query;

		if (error) {
			console.error('Error fetching products:', error);
			return;
		}

		products = productData;
		totalCount = count;
		totalPages = Math.ceil(count / limit);
	}

	function goToPage(newPage) {
		if (newPage > 0 && newPage <= totalPages) {
			page = newPage;
			fetchProducts(page);
		}
	}

	function selectCategory(categoryId) {
		selectedCategoryId = categoryId;
		page = 1; // Reset to first page when changing category
		fetchProducts(page);
	}

	onMount(() => {
		fetchProducts(page);
	});
</script>

<div class="flex">
	<aside class="">
		<ul class="menu bg-base-200 rounded-box w-56">
			<li class="menu-title text-black">Categories</li>
			<li>
				<button
					class={selectedCategoryId === null ? 'active' : ''}
					on:click={() => selectCategory(null)}>All categories</button
				>
			</li>
			{#each categories as category}
				<li>
					<button
						class={selectedCategoryId === category.id ? 'active' : ''}
						on:click={() => selectCategory(category.id)}
					>
						{category.category_name}
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<main class="flex flex-col items-center gap-2">
		{#if products.length > 0}
			<section class="flex flex-wrap gap-4 justify-center">
				{#each products as product}
					<ProductCard Product={product}></ProductCard>
				{/each}
			</section>
			<div class="flex justify-between items-center my-4">
				<button on:click={() => goToPage(page - 1)} disabled={page === 1} class="btn btn-secondary">
					Previous
				</button>
				<span>Page {page} of {totalPages}</span>
				<button
					on:click={() => goToPage(page + 1)}
					disabled={page === totalPages}
					class="btn btn-secondary">Next</button
				>
			</div>
		{:else}
			<p>No products found</p>
		{/if}
	</main>
</div>
