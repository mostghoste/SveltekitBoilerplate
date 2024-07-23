<script>
	/** @type {import('./$types').PageData} */
	export let data;
</script>

<article class="p-4 flex flex-col gap-4">
	<div>
		<h1 class="font-bold text-2xl">Examples</h1>
		<p class="p">It should be safe to delete the whole Examples route.</p>
	</div>

	<div>
		<h2 class="font-bold text-xl">Loading data</h2>
		<p>This data is loaded server side in +page.server.js</p>
		<p>Raw data: {JSON.stringify(data)}</p>
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
