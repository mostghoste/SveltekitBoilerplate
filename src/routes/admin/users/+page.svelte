<script>
	export let data;
	$: ({ supabase, user, role, users } = data);
</script>

<h1>All Users</h1>
<table class="table">
	<thead>
		<tr>
			<th>Email</th>
			<th>Name</th>
			<th>Company</th>
			<th>Customer Group</th>
			<th>Status</th>
		</tr>
	</thead>
	<tbody>
		{#each users as user}
			<tr>
				<td>{user.role === 'admin' ? '👑 ' : ''}{user.email}</td>
				<td
					>{user.first_name || user.last_name
						? `${user.first_name || ''} ${user.last_name || ''}`
						: '-'}</td
				>
				<td>{user.company || '-'}</td>
				<td>{user.customer_group || 'Default'}</td>
				<td>{user.status || 'Unknown'}</td>
			</tr>
		{/each}
	</tbody>
</table>
