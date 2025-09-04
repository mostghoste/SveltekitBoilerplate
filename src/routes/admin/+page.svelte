<script>
	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, user, role } = data);
</script>

<p>This page is only accessible to admin users</p>
<p>Role: {role}</p>

<div class="flex flex-wrap gap-4">
	<a href="/admin/users" class="btn">Manage users</a>
	<a href="/admin/products" class="btn">Manage products</a>
	<a href="/admin/categories" class="btn">Manage categories</a>
	<a href="/admin/customer_groups" class="btn">Manage customer groups</a>
	<a href="/admin/excel_upload" class="btn">Excel upload</a>
	<a href="/admin/export-products" class="btn btn-primary">Export Products</a>
</div>
