<script>
	/** @type {import('./$types').PageData} */
	export let data;

	// Ensure categories is always an array
	let categories = data.categories || [];
</script>

<h1 class="font-bold">Manage Categories</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>ID</th>
			<th>Category Name</th>
			<!-- <th>Category Description</th> -->
			<th>Actions</th>
		</tr>
	</thead>
	<tbody>
		{#if categories.length > 0}
			{#each categories as category}
				<tr>
					<td>{category.id}</td>
					<td>{category.category_name}</td>
					<!-- <td>{category.category_description || 'No description'}</td> -->
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
	<!-- <div class="flex flex-col gap-1">
		<label for="category_description">Category Description</label>
		<input
			class="input input-bordered"
			type="text"
			id="category_description"
			name="category_description"
		/>
	</div> -->
	<button class="btn btn-success" type="submit">Add Category</button>
</form>
