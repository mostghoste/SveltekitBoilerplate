<script>
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase } = data);

	let { products, languages, productTranslations } = data;
	let productStatuses = {}; // Object to track statuses

	async function updateTranslation(productId, languageId, newName) {
		if (!newName.trim()) return;

		try {
			const formData = new FormData();
			formData.append('product_id', productId);
			formData.append('language_id', languageId);
			formData.append('part_name', newName);

			const response = await fetch('/admin/products/translations?/updateTranslation', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				console.error('Error updating translation:', await response.text());
				setTranslationStatus(productId, languageId, 'error');
				return;
			}

			setTranslationStatus(productId, languageId, 'success');

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

			setTimeout(() => clearTranslationStatus(productId, languageId), 3000);
		} catch (error) {
			console.error('Error updating translation:', error);
			setTranslationStatus(productId, languageId, 'error');
		}
	}

	async function updatePartName(productId, newName) {
		if (!newName.trim()) return;

		try {
			const { error } = await supabase
				.from('products')
				.update({ part_name: newName })
				.match({ id: productId });

			if (error) {
				console.error('Error updating part name:', error);
				setPartNameStatus(productId, 'error');
				return;
			}

			setPartNameStatus(productId, 'success');
			const product = products.find((p) => p.id === productId);
			if (product) {
				product.part_name = newName;
			}
			products = [...products];

			setTimeout(() => clearPartNameStatus(productId), 3000);
		} catch (error) {
			console.error('Error updating part name:', error);
			setPartNameStatus(productId, 'error');
		}
	}

	function getTranslation(productId, languageId) {
		return (
			productTranslations.find(
				(trans) => trans.product_id === productId && trans.language_id === languageId
			)?.part_name || ''
		);
	}

	function setTranslationStatus(productId, languageId, status) {
		if (!productStatuses[productId]) productStatuses[productId] = {};
		productStatuses[productId][languageId] = status;
		productStatuses = { ...productStatuses };
	}

	function clearTranslationStatus(productId, languageId) {
		if (productStatuses[productId]) {
			productStatuses[productId][languageId] = '';
			productStatuses = { ...productStatuses };
		}
	}

	function setPartNameStatus(productId, status) {
		if (!productStatuses[productId]) productStatuses[productId] = {};
		productStatuses[productId].partName = status;
		productStatuses = { ...productStatuses };
	}

	function clearPartNameStatus(productId) {
		if (productStatuses[productId]) {
			productStatuses[productId].partName = '';
			productStatuses = { ...productStatuses };
		}
	}

	function getStatusClass(status) {
		if (status === 'success') return 'border-green-500';
		if (status === 'error') return 'border-red-500';
		return '';
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
					<td>
						<input
							type="text"
							value={product.part_name}
							class="input input-bordered {getStatusClass(productStatuses[product.id]?.partName)}"
							on:change={(e) => updatePartName(product.id, e.target.value)}
						/>
					</td>
					{#each languages as language}
						<td>
							<input
								type="text"
								value={getTranslation(product.id, language.id)}
								class="input input-bordered {getStatusClass(
									productStatuses[product.id]?.[language.id]
								)}"
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
