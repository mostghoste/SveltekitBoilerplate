<script>
	export let form;
	let logs = form?.logs ?? [];
	let previewRows = form?.previewRows ?? [];
	let file; // used for the parse-file form

	// If parseFile was successful, we can show the preview table
	// and enable the "Confirm Upload" button.
	$: showPreview = previewRows.length > 0;

	// We'll keep track of the final success/failure from confirm
	let confirmMessage = form?.message || '';
</script>

<h1 class="text-xl">Excel/CSV Upload and Confirmation</h1>

<!-- 1) Upload & Preview Form -->
<form method="post" action="?/parseFile" enctype="multipart/form-data" class="border p-2 my-2">
	<h2>Step 1: Upload File for Preview</h2>
	<input type="file" name="file" bind:this={file} accept=".csv,text/csv" />
	<button type="submit" class="btn btn-primary">Preview CSV</button>
</form>

<!-- Show logs from parseFile, if any -->
<h2 class="text-lg">Logs</h2>
{#if logs.length}
	<h3>These are the logs:</h3>
	<ul>
		{#each logs as line}
			<li>{line}</li>
		{/each}
	</ul>
{:else}
	<h3>There are currently no logs.</h3>
{/if}

<!-- 2) If we have preview rows, show them in a table -->
<h2 class="text-lg">Data Preview</h2>
{#if showPreview}
	<hr />
	<table class="table-auto border-collapse w-full">
		<thead>
			<tr>
				{#each Object.keys(previewRows[0]) as header}
					<th class="border p-2">{header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each previewRows as row}
				<tr>
					{#each Object.keys(row) as col}
						<td class="border p-2">{row[col]}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>

	<!-- 3) Final Confirmation Form -->
	<form method="post" action="?/confirmUpload" class="my-4">
		<!-- Hidden field containing JSON of the preview rows -->
		<input type="hidden" name="previewJson" value={JSON.stringify(previewRows)} />

		<button type="submit" class="btn btn-secondary"> Confirm & Upload to DB </button>
	</form>
{:else}
	<h3>There is nothing to preview.</h3>
{/if}

<!-- 4) If confirmUpload ran, show a success message -->
{#if confirmMessage}
	<p class="text-green-600 font-bold">Result: {confirmMessage}</p>
{/if}
