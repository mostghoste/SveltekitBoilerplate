<script>
	export let data;
	let selectedUsers = [];
	let selectedCustomerGroup = '';
	let confirmDisabled = true;

	$: ({ supabase, user, role, users, customerGroups } = data);

	function toggleUserSelection(userId) {
		if (selectedUsers.includes(userId)) {
			selectedUsers = selectedUsers.filter((id) => id !== userId);
		} else {
			selectedUsers = [...selectedUsers, userId];
		}
	}

	function handleCustomerGroupChange(event) {
		selectedCustomerGroup = event.target.value;
		confirmDisabled = !selectedCustomerGroup;
	}

	function handleSubmit(event) {
		if (!confirmDisabled) {
			event.target.submit();
		}
	}
</script>

<main class="flex flex-col gap-2 m-2">
	<h1 class="font-bold">User management</h1>
	<table class="table">
		<thead>
			<tr>
				<th
					><input
						type="checkbox"
						on:change={() => users.forEach((user) => toggleUserSelection(user.id))}
					/></th
				>
				<th>Email</th>
				<th>Name</th>
				<th>Phone number</th>
				<th>Company</th>
				<th>Customer Group</th>
				<th>Status</th>
			</tr>
		</thead>
		<tbody>
			{#each users as user}
				<tr>
					<td
						><input
							type="checkbox"
							value={user.id}
							on:change={() => toggleUserSelection(user.id)}
						/></td
					>
					<td>{user.role === 'admin' ? '👑 ' : ''}{user.email}</td>
					<td
						>{user.first_name || user.last_name
							? `${user.first_name || ''} ${user.last_name || ''}`
							: '-'}</td
					>
					<td>{user.phone_number || '-'}</td>
					<td>{user.company || '-'}</td>
					<td>{user.customer_group || 'Default'}</td>
					<td class="flex items-center gap-1">
						{#if user.status === 'active'}
							<div class="bg-green-500 rounded-full w-3 h-3"></div>
							Active
						{:else if user.status === 'invited'}
							<div class="bg-yellow-500 rounded-full w-3 h-3"></div>
							Invited
						{:else}
							Unknown
						{/if}
					</td>
				</tr>
			{/each}
			<tr>
				<td colspan="7" class="font-bold">
					Total users: {users.length}
					{#if selectedUsers.length > 0}
						&nbsp;| Selected users: {selectedUsers.length}
					{/if}
				</td>
			</tr>
		</tbody>
	</table>

	<!-- Management actions -->
	<section class="mt-4">
		<h2 class="font-bold">Management actions</h2>
		<div class="flex gap-2 items-center">
			<label for="customer_group_select">Change customer group to</label>
			<select
				id="customer_group_select"
				class="select select-bordered"
				on:change={handleCustomerGroupChange}
			>
				<option value="">Select group</option>
				{#each customerGroups as group}
					<option value={group.id}>{group.group_name}</option>
				{/each}
			</select>
			<form
				method="post"
				action="?/updateCustomerGroups"
				class="flex items-center gap-2"
				on:submit={handleSubmit}
			>
				<input type="hidden" name="customer_group_id" value={selectedCustomerGroup} />
				<input type="hidden" name="user_ids" value={selectedUsers.join(',')} />
				<button class="btn btn-success" type="submit" disabled={confirmDisabled}>Confirm</button>
			</form>
		</div>
	</section>

	<!-- Form to invite a new user -->
	<form method="post" action="?/invite" class="flex gap-2 flex-col p-2 border w-96 mt-4">
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
