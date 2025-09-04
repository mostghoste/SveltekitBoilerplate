<script>
	/** @type {import('./$types').PageData} */
	export let data;
	$: ({ supabase, user, role } = data);

	let isExporting = false;

	async function exportProducts() {
		try {
			isExporting = true;
			const response = await fetch('/api/admin/export-products');

			if (!response.ok) {
				throw new Error('Export failed');
			}

			// Get filename from response headers
			const contentDisposition = response.headers.get('content-disposition');
			const filename = contentDisposition
				? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
				: 'products-export.xlsx';

			// Create blob and download
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (error) {
			console.error('Export error:', error);
			alert('Failed to export products. Please try again.');
		} finally {
			isExporting = false;
		}
	}
</script>

<div class="container mx-auto p-6">
	<div class="max-w-2xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Export Products</h1>

		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<h2 class="card-title">Generate Excel Report</h2>
				<p class="text-base-content/70 mb-4">Export all products with their details including:</p>
				<ul class="list-disc list-inside text-base-content/70 mb-6 space-y-1">
					<li>Product ID and Part Code</li>
					<li>Product Image URL</li>
					<li>Category Name</li>
					<li>Part Name (English)</li>
					<li>Prices for each customer group</li>
				</ul>

				<div class="card-actions">
					<button class="btn btn-primary btn-wide" on:click={exportProducts} disabled={isExporting}>
						{#if isExporting}
							<span class="loading loading-spinner loading-sm"></span>
							Generating Excel...
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							Download Excel Report
						{/if}
					</button>

					<a href="/admin" class="btn btn-ghost">Back to Admin Panel</a>
				</div>
			</div>
		</div>
	</div>
</div>
