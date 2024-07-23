<script>
	export let Product;
</script>

{#if Product}
	<article>
		<img
			src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{Product.image}"
			alt="Part {Product.part_code}"
		/>
		<h3>{Product.part_name}</h3>
		<h4>{Product.part_code}</h4>
		<p>Price: <span>{Product.price.toFixed(2)}</span></p>
	</article>
{/if}
