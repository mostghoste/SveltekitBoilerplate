<script>
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages.js';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte'; // Import the language switcher

	import '../app.css';
	import { invalidate, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import AgrobondLogo from '$lib/assets/images/logo.png';
	import CartPreviewSmall from '$lib/components/CartPreviewSmall.svelte';
	import { cart } from '$lib/stores/cart';

	let CartProducts = [];
	let isPing = false;
	let pingTimeout;

	cart.subscribe((value) => {
		if (value.length > CartProducts.length) {
			isPing = true;
			clearTimeout(pingTimeout);
			pingTimeout = setTimeout(() => {
				isPing = false;
			}, 1000);
		}
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

<ParaglideJS {i18n}>
	{#if user}
		<nav class="navbar bg-base-200 sticky top-0 shadow-md z-50">
			<div class="flex-1">
				<a
					class="btn btn-ghost normal-case text-xl flex items-center"
					href={i18n.resolveRoute('/products')}
				>
					<img src={AgrobondLogo} alt="Agrobond logo" class="max-w-24 mr-2" />
				</a>
			</div>

			<LanguageSwitcher />
			<ul class="flex space-x-2">
				<li class="btn btn-ghost"><a href={i18n.resolveRoute('/products')}>{m.products()}</a></li>
				{#if role === 'admin'}
					<li class="btn btn-ghost">
						<a href={i18n.resolveRoute('/admin/users')}>{m.manage_users()}</a>
					</li>
					<li class="btn btn-ghost">
						<a href={i18n.resolveRoute('/admin/products')}>{m.manage_products()}</a>
					</li>
					<li class="btn btn-ghost">
						<a href={i18n.resolveRoute('/admin/customer_groups')}>{m.manage_customer_groups()}</a>
					</li>
					<li class="btn btn-ghost">
						<a href={i18n.resolveRoute('/admin/categories')}>{m.manage_categories()}</a>
					</li>
				{/if}
			</ul>

			<div class="flex-none">
				<div class="dropdown dropdown-end">
					<button class="btn btn-ghost btn-circle relative">
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
						{#if isPing}
							<span class="absolute inset-0 animate-ping rounded-full bg-success opacity-75"></span>
						{/if}
					</button>
					<div class="card card-compact dropdown-content bg-base-100 z-[1] mt-3 w-72 shadow">
						<CartPreviewSmall {user}></CartPreviewSmall>
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
						<li><button on:click={logout}>{m.logout()}</button></li>
					</ul>
				</div>
			</div>
		</nav>
	{/if}

	<slot></slot>
</ParaglideJS>
