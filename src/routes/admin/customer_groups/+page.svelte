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
			<!-- <th class="">Created At</th> -->
		</tr>
	</thead>
	<tbody>
		{#each data.customerGroups as group}
			<tr>
				<td class="">{group.id}</td>
				<td class="">{group.group_name}</td>
				<td class="">{group.group_description || 'No description'}</td>
				<!-- <td class="">{new Date(group.created_at).toLocaleString()}</td> -->
			</tr>
		{/each}
	</tbody>
</table>
