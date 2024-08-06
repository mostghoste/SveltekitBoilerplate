<script>
	import * as m from '$lib/paraglide/messages.js'; // Ensure correct import path

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase } = data);

	let { products, languages, productTranslations } = data;

	async function updateTranslation(productId, languageId, newName) {
		if (!newName.trim()) return;

		try {
			const formData = new FormData();
			formData.append('product_id', productId);
			formData.append('language_id', languageId);
			formData.append('part_name', newName);

			const response = await fetch('/admin/products/translations/updateTranslation', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				console.error('Error updating translation:', await response.text());
				return;
			}

			// Update the local state
			const translation = productTranslations.find(
				(trans) => trans.product_id === productId && trans.language_id === languageId
			);

			if (translation) {
				translation.part_name = newName;
			} else {
				productTranslations.push({
					product_id: productId,
					language_id: languageId,
					part_name: newName
				});
			}

			productTranslations = [...productTranslations];
		} catch (error) {
			console.error('Error updating translation:', error);
		}
	}

	function getTranslation(productId, languageId) {
		return (
			productTranslations.find(
				(trans) => trans.product_id === productId && trans.language_id === languageId
			)?.part_name || ''
		);
	}
</script>

<h1 class="font-bold">{m.translations()}</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>{m.product_id()}</th>
			<th>{m.part_code()}</th>
			<th>{m.part_name()}</th>
			{#each languages as language}
				<th>{language.name}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#if products.length > 0}
			{#each products as product}
				<tr>
					<td>{product.id}</td>
					<td>{product.part_code}</td>
					<td>{product.part_name}</td>
					{#each languages as language}
						<td>
							<input
								type="text"
								value={getTranslation(product.id, language.id)}
								class="input input-bordered"
								on:change={(e) => updateTranslation(product.id, language.id, e.target.value)}
							/>
						</td>
					{/each}
				</tr>
			{/each}
		{:else}
			<tr>
				<td colspan={languages.length + 3}>{m.no_products_available()}</td>
			</tr>
		{/if}
	</tbody>
</table>
