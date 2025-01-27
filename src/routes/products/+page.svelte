<script>
	import { onMount } from 'svelte';
	import ProductRow from './ProductRow.svelte';
	import { debounce } from 'lodash-es';
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, categories, customerGroupId, totalProductCount, languageId } = data);

	let products = [];
	let page = 1;
	const limit = 30;
	let totalCount = 0;
	let selectedCategoryId = null;
	let loading = false;
	let allLoaded = false;
	let displayCount = 0;
	let searchTerm = '';
	let currentLanguageId = undefined;

	$: if (languageId !== currentLanguageId) {
		currentLanguageId = languageId;
		products = [];
		page = 1;
		allLoaded = false;
		searchProducts();
	}

	function selectCategory(categoryId) {
		selectedCategoryId = categoryId;
		products = [];
		page = 1;
		allLoaded = false;
		searchProducts();
	}

	let observer;

	function setupIntersectionObserver() {
		const options = {
			root: null,
			rootMargin: '0px',
			threshold: 1.0
		};

		observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting && !loading && !allLoaded) {
				searchProducts();
			}
		}, options);

		const target = document.querySelector('#infinite-scroll-trigger');
		if (target) observer.observe(target);
	}

	const searchProducts = debounce(async () => {
		if (loading || allLoaded) return;
		loading = true;

		let query = supabase
			.from('products')
			.select(
				`
			id, image, part_code, part_name, category_id, 
			categories(category_name), 
			prices(price)
		`,
				{ count: 'exact' }
			)
			.eq('prices.customer_group_id', customerGroupId)
			.range((page - 1) * limit, page * limit - 1);

		if (selectedCategoryId) {
			query = query.eq('category_id', selectedCategoryId);
		}

		if (searchTerm.length >= 2) {
			query = query.or(`part_name.ilike.%${searchTerm}%,part_code.ilike.%${searchTerm}%`);
		}

		const { data: productData, error, count } = await query;

		if (error) {
			console.error('Error searching products:', error);
			loading = false;
			return;
		}

		if (productData.length > 0) {
			products = [...products, ...productData];
			page++;
		} else {
			allLoaded = true;
		}

		totalCount = count;
		displayCount = products.length;
		loading = false;
	}, 300);

	onMount(() => {
		setupIntersectionObserver();
	});
</script>

<div class="flex gap-2 p-2">
	<aside class="mt-10">
		<ul class="menu bg-base-200 rounded-box w-56">
			<li class="menu-title text-black">{m.search()}</li>
			<li>
				<input
					type="text"
					placeholder={m.search_placeholder()}
					class="input input-bordered w-full"
					bind:value={searchTerm}
					on:input={() => {
						products = [];
						page = 1;
						allLoaded = false;
						searchProducts();
					}}
				/>
			</li>
			<li class="menu-title text-black">{m.categories()}</li>
			<li>
				<button
					class={selectedCategoryId === null ? 'active' : ''}
					on:click={() => selectCategory(null)}>{m.all_categories()}</button
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
	<main class="flex flex-col items-center gap-2 w-full">
		<div class="overflow-x-auto w-full">
			<table class="table">
				<thead class="w-full">
					<tr>
						<th class="w-32">{m.image()}</th>
						<th>{m.part_details()}</th>
						<th class="w-32 text-end">{m.price()}</th>
						<th class="w-32 text-center">{m.quantity()}</th>
					</tr>
				</thead>
				<tbody>
					{#if products.length > 0}
						{#each products as product}
							<ProductRow Product={product} />
						{/each}
					{:else}
						<tr>
							<td colspan="4" class="text-center">{m.no_products_found()}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>

		{#if loading}
			<div class="loading">{m.loading()}</div>
		{/if}

		{#if allLoaded}
			<div class="text-center mt-4">
				{m.displaying_products({ displayCount, totalProductCount })}
			</div>
		{:else}
			<div id="infinite-scroll-trigger" class="h-1"></div>
		{/if}
	</main>
</div>
