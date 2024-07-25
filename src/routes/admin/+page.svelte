<script>
	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, user, role } = data);
</script>

<p>This page is only accessible to admin users</p>
<p>Role: {role}</p>

<a href="/admin/users" class="btn">Manage users</a>
