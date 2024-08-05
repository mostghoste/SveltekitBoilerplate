<script>
	import * as m from '$lib/paraglide/messages.js';

	export let page;
	export let totalPages;
	export let totalCount;
	export let goToPage;
</script>

<div class="flex justify-between items-center">
	<span>{m.total_products({ totalCount })}</span>
	<div class="flex items-center gap-2">
		<button class="btn btn-sm btn-accent" disabled={page === 1} on:click={() => goToPage(page - 1)}>
			{'<'}
		</button>
		<span>{m.pagination_info({ page, totalPages })}</span>
		<button
			class="btn btn-sm btn-accent"
			disabled={page === totalPages}
			on:click={() => goToPage(page + 1)}
		>
			{'>'}
		</button>
	</div>
</div>
