<script>
	import { onMount } from 'svelte';
	import ProductRow from './ProductRow.svelte';
	import { debounce } from 'lodash-es';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';

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

	async function fetchProducts() {
		if (loading || allLoaded) return;

		loading = true;
		const from = (page - 1) * limit;
		const to = from + limit - 1;

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
			.range(from, to);

		if (selectedCategoryId) {
			query = query.eq('category_id', selectedCategoryId);
		}

		if (languageId !== undefined) {
			// Join with product_translations to get translated names for non-English languages
			query = query
				.select(
					`
            id, image, part_code, part_name, category_id, 
            categories(category_name), 
            prices(price),
            product_translations!inner(part_name)
        `
				)
				.eq('product_translations.language_id', languageId);
		}

		const { data: productData, error, count } = await query;

		if (error) {
			console.error('Error fetching products:', error);
			loading = false;
			return;
		}

		products = productData.map((product) => ({
			...product,
			part_name:
				languageId !== undefined
					? product.product_translations[0]?.part_name || product.part_name
					: product.part_name
		}));

		totalCount = count;
		displayCount = products.length;
		page++;
		loading = false;

		if (products.length >= totalCount) {
			allLoaded = true;
		}
	}

	$: if (languageId !== currentLanguageId) {
		currentLanguageId = languageId;
		products = [];
		page = 1;
		allLoaded = false;
		fetchProducts();
	}

	function selectCategory(categoryId) {
		selectedCategoryId = categoryId;
		products = [];
		page = 1;
		allLoaded = false;
		fetchProducts();
	}

	let observer;

	function setupIntersectionObserver() {
		const options = {
			root: null,
			rootMargin: '0px',
			threshold: 1.0
		};

		observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				fetchProducts();
			}
		}, options);

		const target = document.querySelector('#infinite-scroll-trigger');
		if (target) observer.observe(target);
	}

	const searchProducts = debounce(async () => {
		products = [];
		page = 1;
		allLoaded = false;

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
			.range(0, limit - 1);

		let translatedProducts = []; // Initialize outside the if block

		if (selectedCategoryId) {
			query = query.eq('category_id', selectedCategoryId);
		}

		// Handle searching and language-specific product names
		if (languageId !== undefined) {
			const { data: translatedData, error } = await supabase
				.from('product_translations')
				.select('product_id, part_name')
				.eq('language_id', languageId)
				.ilike('part_name', `%${searchTerm}%`);

			if (error) {
				console.error('Error fetching translated products:', error);
				loading = false;
				return;
			}

			translatedProducts = translatedData;
			const translatedProductIds = translatedProducts.map((t) => t.product_id);

			// Filter products by the translated product IDs
			if (translatedProductIds.length > 0) {
				query = query.in('id', translatedProductIds);
			} else if (searchTerm.length >= 2) {
				// If there are no translated products and search term is long enough, show no results
				products = [];
				loading = false;
				allLoaded = true;
				return;
			}
		} else if (searchTerm.length >= 2) {
			// Search in original English part names
			query = query.or(`part_name.ilike.%${searchTerm}%,part_code.ilike.%${searchTerm}%`);
		}

		const { data: productData, error, count } = await query;

		if (error) {
			console.error('Error searching products:', error);
			return;
		}

		products = productData.map((product) => ({
			...product,
			part_name:
				languageId !== undefined
					? translatedProducts.find((t) => t.product_id === product.id)?.part_name ||
						product.part_name
					: product.part_name
		}));

		totalCount = count;
		displayCount = products.length;

		if (products.length >= totalCount) {
			allLoaded = true;
		}
	}, 300);

	$: if (searchTerm !== undefined) {
		searchProducts();
	}

	onMount(() => {
		fetchProducts();
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
					on:input={searchProducts}
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
