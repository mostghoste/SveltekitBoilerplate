<script>
	export let Product;
</script>

{#if Product}
	<article class="flex bg-base-200 w-[36rem] rounded-box shadow-md">
		<figure class="w-64 h-64 flex justify-center items-center bg-base-100 p-2">
			<img
				src="https://tlsgwucpdiwudwghrljn.supabase.co/storage/v1/object/public/product_images/{Product.image}"
				alt="Part {Product.part_code}"
				class="w-full"
			/>
		</figure>
		<div class="p-4">
			<h3 class="font-bold text-2xl">{Product.part_name}</h3>
			<h4 class="font-bold">Part code: <span class="font-normal">{Product.part_code}</span></h4>
			<p class="font-bold">
				Price: <span class="font-normal text-2xl">{Product.price.toFixed(2)}€</span>
			</p>
		</div>
	</article>
{/if}
