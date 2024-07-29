<script>
	import '../app.css';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AgrobondLogo from '$lib/assets/images/logo.png';

	export let data;
	$: ({ session, supabase, role } = data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});

	$: logout = async () => {
		const { error } = await supabase.auth.signOut();
		if (error) {
			console.error(error);
		}
		invalidateAll();
	};
</script>

<nav class="bg-base-200 flex p-2 justify-between">
	<div class="flex">
		<a class="max-w-24 flex items-center justify-center mx-4" href="/products">
			<img src={AgrobondLogo} alt="Agrobond logo" />
		</a>
		<ul class="flex">
			<li>
				<a class="btn btn-ghost" href="/products">Products</a>
			</li>
			{#if role === 'admin'}
				<li>
					<a class="btn btn-ghost" href="/admin/users">Manage users</a>
				</li>
				<li>
					<a class="btn btn-ghost" href="/admin/products">Manage products</a>
				</li>
				<li>
					<a class="btn btn-ghost" href="/admin/customer_groups">Manage customer groups</a>
				</li>
			{/if}
		</ul>
	</div>
	<button
		on:click={() => {
			logout();
		}}
		class="btn btn-warning">Log out</button
	>
</nav>

<slot></slot>
