<script>
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1 class="font-bold">{m.manage_customer_groups()}</h1>
<table class="table w-full">
	<thead>
		<tr>
			<th>{m.id()}</th>
			<th>{m.group_name()}</th>
			<th>{m.group_description()}</th>
			<th>{m.actions()}</th>
		</tr>
	</thead>
	<tbody>
		{#each data.customerGroups as group}
			<tr>
				<td>{group.id}</td>
				<td>{group.group_name}</td>
				<td>{group.group_description || m.no_description()}</td>
				<td>
					{#if group.group_name !== 'Default'}
						<form
							method="post"
							action="?/deleteCustomerGroup"
							onsubmit="return confirm('{m.confirm_delete_group()}');"
						>
							<input type="hidden" name="group_id" value={group.id} />
							<button class="btn btn-sm btn-error" type="submit">{m.delete_button()}</button>
						</form>
					{/if}
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<!-- Form to add a new customer group -->
<form method="post" action="?/addCustomerGroup" class="flex gap-2 flex-col p-2 border w-96 mt-4">
	<h2 class="font-bold">{m.add_new_customer_group()}</h2>
	<div class="flex flex-col gap-1">
		<label for="group_name">{m.group_name_required()}</label>
		<input class="input input-bordered" type="text" id="group_name" name="group_name" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="group_description">{m.group_description()}</label>
		<input
			class="input input-bordered"
			type="text"
			id="group_description"
			name="group_description"
		/>
	</div>
	<button class="btn btn-success" type="submit">{m.add_group()}</button>
</form>
