<script>
	import ProductCard from './ProductCard.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1>Products</h1>
{#if data.products}
	{#each data.products as product}
		<ProductCard Product={product}></ProductCard>
	{/each}
{:else}
	<p>No products found</p>
{/if}
