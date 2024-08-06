<script>
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase } = data);

	let { categories, languages, categoryTranslations } = data;

	async function updateCategoryName(categoryId, newName) {
		if (!newName.trim()) {
			setCategoryStatus(categoryId, 'error');
			return;
		}

		try {
			const { error } = await supabase
				.from('categories')
				.update({ category_name: newName })
				.match({ id: categoryId });

			if (error) {
				setCategoryStatus(categoryId, 'error');
				console.error('Error updating category name:', error);
				return;
			}

			setCategoryStatus(categoryId, 'success');
			setTimeout(() => {
				clearCategoryStatus(categoryId);
			}, 3000);
		} catch (error) {
			setCategoryStatus(categoryId, 'error');
			console.error('Error updating category name:', error);
		}
	}

	async function updateTranslation(categoryId, languageId, newName) {
		if (!newName.trim()) {
			setTranslationStatus(categoryId, languageId, 'error');
			return;
		}

		try {
			const { error } = await supabase.from('category_translations').upsert(
				{
					category_id: categoryId,
					language_id: languageId,
					category_name: newName
				},
				{ onConflict: ['category_id', 'language_id'] }
			);

			if (error) {
				setTranslationStatus(categoryId, languageId, 'error');
				console.error('Error updating translation:', error);
				return;
			}

			setTranslationStatus(categoryId, languageId, 'success');
			setTimeout(() => {
				clearTranslationStatus(categoryId, languageId);
			}, 3000);
		} catch (error) {
			setTranslationStatus(categoryId, languageId, 'error');
			console.error('Error updating translation:', error);
		}
	}

	function setCategoryStatus(categoryId, status) {
		const category = categories.find((cat) => cat.id === categoryId);
		if (category) {
			category.status = status;
			categories = [...categories];
		}
	}

	function clearCategoryStatus(categoryId) {
		const category = categories.find((cat) => cat.id === categoryId);
		if (category) {
			category.status = '';
			categories = [...categories];
		}
	}

	function setTranslationStatus(categoryId, languageId, status) {
		const translation = categoryTranslations.find(
			(trans) => trans.category_id === categoryId && trans.language_id === languageId
		);
		if (translation) {
			translation.status = status;
			categoryTranslations = [...categoryTranslations];
		}
	}

	function clearTranslationStatus(categoryId, languageId) {
		const translation = categoryTranslations.find(
			(trans) => trans.category_id === categoryId && trans.language_id === languageId
		);
		if (translation) {
			translation.status = '';
			categoryTranslations = [...categoryTranslations];
		}
	}

	function getStatusClass(status) {
		if (status === 'success') return 'border-green-500';
		if (status === 'error') return 'border-red-500';
		return '';
	}
</script>

<h1 class="font-bold">{m.manage_categories()}</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>{m.id()}</th>
			<th>{m.category_name()}</th>
			{#each languages as language}
				<th>{language.name}</th>
			{/each}
			<th>{m.actions()}</th>
		</tr>
	</thead>
	<tbody>
		{#if categories.length > 0}
			{#each categories as category}
				<tr>
					<td>{category.id}</td>
					<td>
						<input
							type="text"
							value={category.category_name}
							class="input input-bordered {getStatusClass(category.status)}"
							on:change={(e) => updateCategoryName(category.id, e.target.value)}
						/>
					</td>
					{#each languages as language}
						<td>
							<input
								type="text"
								value={categoryTranslations.find(
									(trans) => trans.category_id === category.id && trans.language_id === language.id
								)?.category_name || ''}
								class="input input-bordered {getStatusClass(
									categoryTranslations.find(
										(trans) =>
											trans.category_id === category.id && trans.language_id === language.id
									)?.status
								)}"
								on:change={(e) => updateTranslation(category.id, language.id, e.target.value)}
							/>
						</td>
					{/each}
					<td>
						<form
							method="post"
							action="?/deleteCategory"
							onsubmit="return confirm('{m.confirm_delete_category()}');"
						>
							<input type="hidden" name="category_id" value={category.id} />
							<button class="btn btn-sm btn-error" type="submit">{m.delete_button()}</button>
						</form>
					</td>
				</tr>
			{/each}
		{:else}
			<tr>
				<td colspan={languages.length + 3}>{m.no_categories_available()}</td>
			</tr>
		{/if}
	</tbody>
</table>

<!-- Form to add a new category -->
<form method="post" action="?/addCategory" class="flex gap-2 flex-col p-2 border w-96 mt-4">
	<h2 class="font-bold">{m.add_new_category()}</h2>
	<div class="flex flex-col gap-1">
		<label for="category_name">{m.category_name_required()}</label>
		<input
			class="input input-bordered"
			type="text"
			id="category_name"
			name="category_name"
			required
		/>
	</div>
	<button class="btn btn-success" type="submit">{m.add_category()}</button>
</form>
