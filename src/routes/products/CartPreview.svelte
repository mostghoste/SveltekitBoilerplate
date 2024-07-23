<script>
	export let CartProducts;
</script>

{#if CartProducts && CartProducts.length > 0}
	{#each CartProducts as product}
		<p>{JSON.stringify(product)}</p>
	{/each}
{:else}
	<p>Your cart is empty</p>
{/if}
