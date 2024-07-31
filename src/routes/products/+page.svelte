<script>
	import CartPreview from './CartPreview.svelte';
	import ProductCard from './ProductCard.svelte';
	import { onMount } from 'svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase } = data);

	let products = [];
	let customerGroupId = data.customerGroupId;
	let page = 1;
	const limit = 30;
	let totalPages = 1;
	let totalCount = 0;

	async function fetchProducts(page) {
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		const {
			data: productData,
			error,
			count
		} = await supabase
			.from('products')
			.select('id, image, part_code, part_name, group_name, prices(price)', { count: 'exact' })
			.eq('prices.customer_group_id', customerGroupId)
			.range(from, to);

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

	onMount(() => {
		fetchProducts(page);
	});
</script>

<main class="flex flex-col items-center gap-2">
	<h1 class="text-2xl p-2">Products</h1>
	<CartPreview></CartPreview>
	{#if products.length > 0}
		<section class="flex flex-wrap gap-4 justify-center">
			{#each products as product}
				<ProductCard Product={product}></ProductCard>
			{/each}
		</section>
		<div class="flex justify-between items-center my-4">
			<button on:click={() => goToPage(page - 1)} disabled={page === 1} class="btn btn-secondary"
				>Previous</button
			>
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
