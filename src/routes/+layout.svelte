<script>
	import '../app.css';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AgrobondLogo from '$lib/assets/images/logo.png';
	import CartPreviewSmall from '$lib/components/CartPreviewSmall.svelte';
	import { cart } from '$lib/stores/cart';

	// Subscribe to the cart store
	let CartProducts = [];
	$: cart.subscribe((value) => {
		CartProducts = value;
	});

	export let data;
	$: ({ session, supabase, role, user } = data);

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

{#if user}
	<div class="navbar bg-base-200">
		<div class="flex-1">
			<a class="btn btn-ghost normal-case text-xl flex items-center" href="/products">
				<img src={AgrobondLogo} alt="Agrobond logo" class="max-w-24 mr-2" />
			</a>
		</div>

		<li class="btn btn-ghost"><a href="/products">Products</a></li>
		{#if role === 'admin'}
			<li class="btn btn-ghost"><a href="/admin/users">Manage users</a></li>
			<li class="btn btn-ghost"><a href="/admin/products">Manage products</a></li>
			<li class="btn btn-ghost"><a href="/admin/customer_groups">Manage customer groups</a></li>
			<li class="btn btn-ghost"><a href="/admin/categories">Manage categories</a></li>
		{/if}

		<div class="flex-none">
			<div class="dropdown dropdown-end">
				<button class="btn btn-ghost btn-circle">
					<div class="indicator">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						<span class="badge badge-sm indicator-item">{CartProducts.length || 0}</span>
					</div>
				</button>
				<div class="card card-compact dropdown-content bg-base-100 z-[1] mt-3 w-64 shadow">
					<!-- <div class="card-body">
						<span class="text-lg font-bold">8 Items</span>
						<span class="text-info">Subtotal: $999</span>
						<div class="card-actions">
							<button class="btn btn-primary btn-block">View cart</button>
						</div>
					</div> -->
					<CartPreviewSmall></CartPreviewSmall>
				</div>
			</div>

			<div class="dropdown dropdown-end">
				<button class="btn btn-ghost btn-circle avatar placeholder">
					<div class="w-10 rounded-full bg-neutral text-neutral-content">
						<span class="text-xl">{user.email.slice(0, 2)}</span>
					</div>
				</button>
				<ul
					class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
				>
					<!-- <li>
						<a href="/profile">Profile</a>
					</li>
					<li><a href="/settings">Settings</a></li> -->
					<li><button on:click={logout}>Logout</button></li>
				</ul>
			</div>
		</div>
	</div>
{/if}

<slot></slot>
