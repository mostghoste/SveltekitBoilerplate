<script>
	export let data;
	$: ({ supabase, user, role, users } = data);
</script>

<main class="flex flex-col gap-2 m-2">
	<h1 class="font-bold">All Users</h1>
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
			<tr><td class="font-bold">Total users: {users.length}</td></tr>
		</tbody>
	</table>

	<!-- Form to invite a new user -->
	<form method="post" action="?/invite" class="flex gap-2 flex-col p-2 border w-96">
		<h2 class="font-bold">Invite a user</h2>
		<div class="flex flex-col gap-1">
			<label for="email">Email <span class="text-red-500">*</span></label>
			<input class="input input-bordered" type="email" id="email" name="email" required />
		</div>
		<div class="flex flex-col gap-1">
			<label for="first_name">First Name</label>
			<input class="input input-bordered" type="text" id="first_name" name="first_name" />
		</div>
		<div class="flex flex-col gap-1">
			<label for="last_name">Last Name</label>
			<input class="input input-bordered" type="text" id="last_name" name="last_name" />
		</div>
		<div class="flex flex-col gap-1">
			<label for="company">Company</label>
			<input class="input input-bordered" type="text" id="company" name="company" />
		</div>
		<div class="flex flex-col gap-1">
			<label for="phone">Phone</label>
			<input class="input input-bordered" type="tel" id="phone" name="phone" />
		</div>
		<button class="btn btn-success" type="submit">Invite User</button>
	</form>
</main>
