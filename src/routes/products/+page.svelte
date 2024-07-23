<script>
	import CartPreview from './CartPreview.svelte';
	import ProductCard from './ProductCard.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<main class="flex flex-col items-center gap-2">
	<h1 class="text-2xl p-2">Products</h1>
	<CartPreview></CartPreview>
	{#if data.products}
		<section class="flex flex-wrap gap-4 justify-center">
			{#each data.products as product}
				<ProductCard Product={product}></ProductCard>
			{/each}
		</section>
	{:else}
		<p>No products found</p>
	{/if}
</main>
