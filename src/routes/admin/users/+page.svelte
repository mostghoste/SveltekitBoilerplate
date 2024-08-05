<script>
	import { i18n } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages.js';

	export let data;
	let selectedUsers = [];
	let selectedCustomerGroup = '';
	let confirmDisabled = true;

	$: ({ supabase, user, role, users, customerGroups } = data);

	let emailFilter = '';
	let nameFilter = '';
	let phoneFilter = '';
	let companyFilter = '';
	let groupFilter = '';
	let statusFilter = '';

	// Reactive statement to update the confirm button state based on selected customer group
	$: confirmDisabled = !selectedCustomerGroup;

	// Reactive statement to filter users based on the input values
	$: filteredUsers = users.filter((user) => {
		const name = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
		return (
			user.email.toLowerCase().includes(emailFilter.toLowerCase()) &&
			name.includes(nameFilter.toLowerCase()) &&
			(user.phone_number || '').toLowerCase().includes(phoneFilter.toLowerCase()) &&
			(user.company || '').toLowerCase().includes(companyFilter.toLowerCase()) &&
			(user.customer_group || 'Default').toLowerCase().includes(groupFilter.toLowerCase()) &&
			user.status.toLowerCase().includes(statusFilter.toLowerCase())
		);
	});

	// Function to toggle the selection of a single user
	function toggleUserSelection(userId) {
		if (selectedUsers.includes(userId)) {
			selectedUsers = selectedUsers.filter((id) => id !== userId);
		} else {
			selectedUsers = [...selectedUsers, userId];
		}
	}

	// Function to handle the change of the customer group dropdown
	function handleCustomerGroupChange(event) {
		selectedCustomerGroup = event.target.value;
	}

	// Function to handle the selection/deselection of all users
	function handleSelectAll(event) {
		if (event.target.checked) {
			selectedUsers = filteredUsers.map((user) => user.id);
		} else {
			selectedUsers = [];
		}
	}

	// Function to handle the form submission
	function handleSubmit(event) {
		if (!confirmDisabled) {
			event.target.submit();
		}
	}
</script>

<h1 class="font-bold">{m.user_management()}</h1>
<table class="table">
	<thead>
		<tr>
			<th></th>
			<th><input type="text" placeholder={m.search_email()} bind:value={emailFilter} /></th>
			<th><input type="text" placeholder={m.search_name()} bind:value={nameFilter} /></th>
			<th><input type="text" placeholder={m.search_phone()} bind:value={phoneFilter} /></th>
			<th><input type="text" placeholder={m.search_company()} bind:value={companyFilter} /></th>
			<th><input type="text" placeholder={m.search_group()} bind:value={groupFilter} /></th>
			<th><input type="text" placeholder={m.search_status()} bind:value={statusFilter} /></th>
		</tr>
		<tr>
			<th>
				<input
					type="checkbox"
					on:change={handleSelectAll}
					checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
				/>
			</th>
			<th>{m.email()}</th>
			<th>{m.name()}</th>
			<th>{m.phone_number()}</th>
			<th>{m.company()}</th>
			<th>{m.customer_group()}</th>
			<th>{m.status()}</th>
		</tr>
	</thead>
	<tbody>
		{#each filteredUsers as user}
			<tr>
				<td>
					<input
						type="checkbox"
						value={user.id}
						on:change={() => toggleUserSelection(user.id)}
						checked={selectedUsers.includes(user.id)}
					/>
				</td>
				<td>{user.role === 'admin' ? '👑 ' : ''}{user.email}</td>
				<td>
					{user.first_name || user.last_name
						? `${user.first_name || ''} ${user.last_name || ''}`
						: '-'}
				</td>
				<td>{user.phone_number || '-'}</td>
				<td>{user.company || '-'}</td>
				<td>{user.customer_group || 'Default'}</td>
				<td class="flex items-center gap-1">
					{#if user.status === 'active'}
						<div class="bg-green-500 rounded-full w-3 h-3"></div>
						{m.active()}
					{:else if user.status === 'invited'}
						<div class="bg-yellow-500 rounded-full w-3 h-3"></div>
						{m.invited()}
					{:else}
						{m.unknown()}
					{/if}
				</td>
			</tr>
		{/each}
		<tr>
			<td colspan="7" class="font-bold">
				{m.total_users({ total: users.length })}
				{#if selectedUsers.length > 0}
					&nbsp;| {m.selected_users({ selected: selectedUsers.length })}
				{/if}
			</td>
		</tr>
	</tbody>
</table>

<!-- Management actions -->
<section class="mt-4">
	<h2 class="font-bold">{m.management_actions()}</h2>
	<div class="flex gap-2 items-center">
		<label for="customer_group_select">{m.change_customer_group()}</label>
		<select
			id="customer_group_select"
			class="select select-bordered"
			on:change={handleCustomerGroupChange}
		>
			<option value="">{m.select_group()}</option>
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
			<button class="btn btn-success" type="submit" disabled={confirmDisabled}>{m.confirm()}</button
			>
		</form>
	</div>
</section>

<!-- Form to invite a new user -->
<form method="post" action="?/invite" class="flex gap-2 flex-col p-2 border w-96 mt-4">
	<h2 class="font-bold">{m.invite_user()}</h2>
	<div class="flex flex-col gap-1">
		<label for="email">{m.email_required()}</label>
		<input class="input input-bordered" type="email" id="email" name="email" required />
	</div>
	<div class="flex flex-col gap-1">
		<label for="first_name">{m.first_name()}</label>
		<input class="input input-bordered" type="text" id="first_name" name="first_name" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="last_name">{m.last_name()}</label>
		<input class="input input-bordered" type="text" id="last_name" name="last_name" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="company">{m.company()}</label>
		<input class="input input-bordered" type="text" id="company" name="company" />
	</div>
	<div class="flex flex-col gap-1">
		<label for="phone">{m.phone()}</label>
		<input class="input input-bordered" type="tel" id="phone" name="phone" />
	</div>
	<button class="btn btn-success" type="submit">{m.invite()}</button>
</form>
