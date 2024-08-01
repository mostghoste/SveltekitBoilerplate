<script>
	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase } = data);

	let categories = data.categories || [];

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

	function getStatusClass(status) {
		if (status === 'success') return 'border-green-500';
		if (status === 'error') return 'border-red-500';
		return '';
	}
</script>

<h1 class="font-bold">Manage Categories</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>ID</th>
			<th>Category Name</th>
			<th>Actions</th>
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
					<td>
						<form
							method="post"
							action="?/deleteCategory"
							onsubmit="return confirm('Are you sure you want to delete this category?');"
						>
							<input type="hidden" name="category_id" value={category.id} />
							<button class="btn btn-sm btn-error" type="submit">Delete</button>
						</form>
					</td>
				</tr>
			{/each}
		{:else}
			<tr>
				<td colspan="4">No categories available.</td>
			</tr>
		{/if}
	</tbody>
</table>

<!-- Form to add a new category -->
<form method="post" action="?/addCategory" class="flex gap-2 flex-col p-2 border w-96 mt-4">
	<h2 class="font-bold">Add a new category</h2>
	<div class="flex flex-col gap-1">
		<label for="category_name">Category Name <span class="text-red-500">*</span></label>
		<input
			class="input input-bordered"
			type="text"
			id="category_name"
			name="category_name"
			required
		/>
	</div>
	<button class="btn btn-success" type="submit">Add Category</button>
</form>
