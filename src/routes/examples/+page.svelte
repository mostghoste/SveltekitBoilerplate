<script>
	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ countries } = data);
</script>

<article class="p-4 flex flex-col gap-4">
	<div>
		<h1 class="font-bold text-2xl">Examples</h1>
		<p class="p">It should be safe to delete the whole Examples route.</p>
	</div>

	<div>
		<h2 class="font-bold text-xl">Loading data</h2>
		<p>This data is loaded server side in +page.server.js</p>
		<p>
			If the below data is empty, your Supabase configuration is incorrect, or you should run the <a
				class="underline"
				href="https://supabase.com/dashboard/project/_/sql/quickstarts">country quickstart</a
			> to populate the database (Or don't, it's mostly for test purposes)
		</p>
		<p>Raw data: {JSON.stringify(countries)}</p>
	</div>

	<div>
		<h2 class="font-bold text-xl">Authentication and authorization</h2>
		<p>
			Authentication is handled via supabase. A new supabase client instance is created for each
			request in hooks.server.ts using the credentials form the request cookie.
		</p>
		<p>
			Read more about Supabase auth <a
				href="https://supabase.com/docs/guides/auth/server-side/sveltekit"
				class="underline">here.</a
			>
		</p>
		<p>
			<strong>Note: </strong>If you don't configure Resend (Or other email sending service) in the
			Authentication section of Supabase, it will have a rate limit of ~3 emails per hour. This
			could cause issues, so don't do that in prod, lol.
		</p>
	</div>

	<div>
		<h2 class="font-bold text-xl">Styling</h2>
		<p>This boilerplate uses tailwindcss and daisyUI for styling.</p>
	</div>

	<div>
		<h3 class="font-bold text-l">Buttons</h3>
		<button class="btn">Button</button>
		<button class="btn btn-neutral">Neutral</button>
		<button class="btn btn-primary">Primary</button>
		<button class="btn btn-secondary">Secondary</button>
		<button class="btn btn-accent">Accent</button>
		<button class="btn btn-ghost">Ghost</button>
		<button class="btn btn-link">Link</button>
	</div>
</article>
