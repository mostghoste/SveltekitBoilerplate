<script>
	import AsideCart from './AsideCart.svelte';
	import { onMount } from 'svelte';
	import ProductRow from './ProductRow.svelte';
	import { debounce } from 'lodash-es';
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, categories = [], customerGroupId, totalProductCount, languageId, user } = data);

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

	// ─── build parent / child maps ────────────────────────────────────────
	let parents = [];
	let childrenMap = {};

	$: if (categories && categories.length) {
		parents = categories.filter((c) => !c.parent_id);
		const map = {};
		categories
			.filter((c) => c.parent_id)
			.forEach((c) => {
				map[c.parent_id] = map[c.parent_id] || [];
				map[c.parent_id].push(c);
			});
		childrenMap = map;
	} else {
		parents = [];
		childrenMap = {};
	}
	// ─────────────────────────────────────────────────────────────────────

	// when language changes, reload products
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
		const options = { root: null, rootMargin: '0px', threshold: 1.0 };
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

		try {
			// ─── determine category filter IDs ───────────────────────────────
			let categoryFilterIds = [];
			if (selectedCategoryId !== null) {
				const childCats = childrenMap[selectedCategoryId] || [];
				if (childCats.length > 0) {
					// parent clicked: filter all its children
					categoryFilterIds = childCats.map((c) => c.id);
				} else {
					// leaf clicked
					categoryFilterIds = [selectedCategoryId];
				}
			}
			// ─────────────────────────────────────────────────────────────────

			// build base query
			let query = supabase
				.from('products')
				.select(
					`
          id,
          image,
          part_code,
          category_id,
          ${languageId ? 'product_translations!inner(language_id, part_name),' : 'part_name,'}
          prices(price),
          categories(category_name)
          `,
					{ count: 'exact' }
				)
				.eq('prices.customer_group_id', customerGroupId)
				.range((page - 1) * limit, page * limit - 1);

			// apply translation filter
			if (languageId) {
				query = query.eq('product_translations.language_id', languageId);
			}

			// ─── apply category filter to base query ────────────────────────
			if (categoryFilterIds.length) {
				query = query.in('category_id', categoryFilterIds);
			}
			// ─────────────────────────────────────────────────────────────────

			if (searchTerm.length >= 2) {
				if (languageId) {
					// translated name search
					let translatedQuery = supabase
						.from('products')
						.select(
							`
              id,
              image,
              part_code,
              category_id,
              product_translations!inner(language_id, part_name),
              prices(price),
              categories(category_name)
              `
						)
						.eq('prices.customer_group_id', customerGroupId)
						.eq('product_translations.language_id', languageId)
						.ilike('product_translations.part_name', `%${searchTerm}%`)
						.range(0, 1000);

					// part_code search
					let partCodeQuery = supabase
						.from('products')
						.select(
							`
              id,
              image,
              part_code,
              category_id,
              product_translations!inner(language_id, part_name),
              prices(price),
              categories(category_name)
              `
						)
						.eq('prices.customer_group_id', customerGroupId)
						.eq('product_translations.language_id', languageId)
						.ilike('part_code', `%${searchTerm}%`)
						.range(0, 1000);

					// ─ apply same category filter ─────────────────────────────
					if (categoryFilterIds.length) {
						translatedQuery = translatedQuery.in('category_id', categoryFilterIds);
						partCodeQuery = partCodeQuery.in('category_id', categoryFilterIds);
					}
					// ────────────────────────────────────────────────────────────

					const [translatedResults, partCodeResults] = await Promise.all([
						translatedQuery,
						partCodeQuery
					]);

					const combinedData = [...(translatedResults.data || []), ...(partCodeResults.data || [])];
					const uniqueData = Array.from(
						new Map(combinedData.map((item) => [item.id, item])).values()
					);
					uniqueData.sort((a, b) => a.id - b.id);

					const startIndex = (page - 1) * limit;
					const paginatedData = uniqueData.slice(startIndex, startIndex + limit);

					if (paginatedData.length > 0) {
						const mappedProducts = paginatedData.map((p) => ({
							...p,
							part_name: p.product_translations[0].part_name
						}));
						products = [...products, ...mappedProducts];
						page++;
						allLoaded = startIndex + limit >= uniqueData.length;
					} else {
						allLoaded = true;
					}

					totalCount = uniqueData.length;
				} else {
					// English simple search
					query = query.or(`part_name.ilike.%${searchTerm}%,part_code.ilike.%${searchTerm}%`);

					const { data: productData, count } = await query;
					if (productData?.length > 0) {
						products = [...products, ...productData];
						page++;
						allLoaded = products.length >= count;
					} else {
						allLoaded = true;
					}
					totalCount = count;
				}
			} else {
				// no search term
				const { data: productData, count } = await query;
				if (productData?.length > 0) {
					const mappedProducts = productData.map((p) => {
						if (languageId && p.product_translations?.length) {
							return { ...p, part_name: p.product_translations[0].part_name };
						}
						return p;
					});
					products = [...products, ...mappedProducts];
					page++;
					allLoaded = products.length >= count;
				} else {
					allLoaded = true;
				}
				totalCount = count;
			}

			displayCount = products.length;
		} catch (error) {
			console.error('Error searching products:', error);
		} finally {
			loading = false;
		}
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
					on:click={() => selectCategory(null)}
				>
					{m.all_categories()}
				</button>
			</li>

			{#each parents as parent}
				<li>
					<details>
						<summary>
							{parent.name}
						</summary>
						<ul>
							{#each childrenMap[parent.id] || [] as child}
								<li>
									<button
										class="w-full text-left px-4 py-1"
										class:active={selectedCategoryId === child.id}
										on:click={() => selectCategory(child.id)}
									>
										{child.name}
									</button>
								</li>
							{/each}
						</ul>
					</details>
				</li>
			{/each}
		</ul>
	</aside>

	<main class="flex flex-col items-center gap-2 w-full">
		<div class="overflow-x-auto w-full">
			<table class="table">
				<thead>
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

	<aside class="mt-10">
		<AsideCart {user} />
	</aside>
</div>
