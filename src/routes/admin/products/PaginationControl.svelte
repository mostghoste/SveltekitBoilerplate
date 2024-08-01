<script>
	export let page;
	export let totalPages;
	export let totalCount;
	export let goToPage;
</script>

<div class="flex justify-between items-center">
	<span>Total Products: {totalCount}</span>
	<div class="flex items-center gap-2">
		<button class="btn btn-sm btn-accent" disabled={page === 1} on:click={() => goToPage(page - 1)}>
			{'<'}
		</button>
		<span>Page {page} of {totalPages}</span>
		<button
			class="btn btn-sm btn-accent"
			disabled={page === totalPages}
			on:click={() => goToPage(page + 1)}
		>
			{'>'}
		</button>
	</div>
</div>
