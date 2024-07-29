<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1 class="font-bold">Manage customer groups</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th class="">ID</th>
			<th class="">Group Name</th>
			<th class="">Group Description</th>
			<th class="">Actions</th>
		</tr>
	</thead>
	<tbody>
		{#each data.customerGroups as group}
			<tr>
				<td class="">{group.id}</td>
				<td class="">{group.group_name}</td>
				<td class="">{group.group_description || 'No description'}</td>
				<td class="">
					{#if group.group_name !== 'Default'}
						<form
							method="post"
							action="?/deleteCustomerGroup"
							onsubmit="return confirm('Are you sure you want to delete this group? All customers assigned to this group will be returned to default, and prices assigned to this group will be deleted.');"
						>
							<input type="hidden" name="group_id" value={group.id} />
							<button class="btn btn-sm btn-error" type="submit">Delete</button>
						</form>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<!-- Form to add a new customer group -->
<form method="post" action="?/addCustomerGroup" class="flex gap-2 flex-col p-2 border w-96 mt-4">
	<h2 class="font-bold">Add a new customer group</h2>
	<div class="flex flex-col gap-1">
		<label for="group_name">Group Name <span class="text-red-500">*</span></label>
		<input class="input input-bordered" type="text" id="group_name" name="group_name" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="group_description">Group Description</label>
		<input
			class="input input-bordered"
			type="text"
			id="group_description"
			name="group_description"
		/>
	</div>
	<button class="btn btn-success" type="submit">Add Group</button>
</form>
