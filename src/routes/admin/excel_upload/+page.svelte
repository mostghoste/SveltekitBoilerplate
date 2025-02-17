<script lang="ts">
	// In SvelteKit/Svelte 4, the page's load and action return values
	// are passed in as exported properties.
	export let data;
	export let form;

	// The full parsed rows are available in data.previewRows.
	let previewRows = form?.previewRows ?? [];

	// For display, only show the first 10 rows.
	let displayRows = previewRows.slice(0, 10);

	// Disable the "Confirm & Upload" button if no file was uploaded.
	let confirmDisabled = previewRows.length === 0;

	// Separate log arrays from the server.
	let logsInfo = form?.logsInfo ?? [];
	let logsDev = form?.logsDev ?? [];

	// Default log mode is info; toggle between 'info' and 'dev' via buttons.
	let logMode: 'info' | 'dev' = 'info';
</script>

<h1 class="text-xl">Excel/CSV Upload and Confirmation</h1>

<!-- 1) Upload & Preview Form -->
<form method="post" action="?/parseFile" enctype="multipart/form-data" class="border p-2 my-2">
	<h2>Step 1: Upload File for Preview</h2>
	<input type="file" name="file" accept=".csv,text/csv" />
	<button type="submit" class="btn btn-primary">Preview CSV</button>
</form>

<!-- Display Logs -->
<h2 class="text-lg">Logs</h2>
<!-- Logs Toggle Buttons -->
<div class="my-2">
	<button
		class="btn"
		class:btn-primary={logMode === 'info'}
		class:btn-outline-secondary={logMode !== 'info'}
		on:click={() => (logMode = 'info')}
	>
		Info
	</button>
	<button
		class="btn"
		class:btn-primary={logMode === 'dev'}
		class:btn-outline-secondary={logMode !== 'dev'}
		on:click={() => (logMode = 'dev')}
	>
		Dev
	</button>
</div>

{#if logMode === 'info'}
	{#if logsInfo.length}
		<ul class="border">
			{#each logsInfo as line}
				<li
					class={line.toLowerCase().includes('error')
						? 'text-red-600'
						: line.toLowerCase().includes('warning')
							? 'text-yellow-500'
							: ''}
				>
					{line}
				</li>
			{/each}
		</ul>
	{:else}
		<p>No Info logs available.</p>
	{/if}
{:else if logMode === 'dev'}
	{#if logsDev.length}
		<ul class="border">
			{#each logsDev as line}
				<li
					class={line.toLowerCase().includes('error')
						? 'text-red-600'
						: line.toLowerCase().includes('warning')
							? 'text-yellow-500'
							: ''}
				>
					{line}
				</li>
			{/each}
		</ul>
	{:else}
		<p>No Developer logs available.</p>
	{/if}
{/if}

<!-- 2) Data Preview Table (first 10 rows) -->
<h2 class="text-lg">Data Preview (First 10 Rows)</h2>
{#if displayRows.length}
	<table class="table-auto border-collapse w-full">
		<thead>
			<tr>
				{#each Object.keys(displayRows[0]) as header}
					<th class="border p-2">{header}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each displayRows as row}
				<tr>
					{#each Object.keys(row) as key}
						<td class="border p-2">{row[key]}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<p>No data to preview.</p>
{/if}

<!-- 3) Final Confirmation Form -->
{#if previewRows.length}
	<form method="post" action="?/confirmUpload" class="my-4">
		<!-- Hidden field containing the full JSON of parsed rows -->
		<input type="hidden" name="previewJson" value={JSON.stringify(previewRows)} />
		<button type="submit" class="btn btn-secondary" disabled={confirmDisabled}>
			Confirm &amp; Upload to DB
		</button>
	</form>
{/if}

<!-- 4) Display Confirm Upload Result -->
{#if form?.message}
	<p class="text-green-600 font-bold">Result: {form.message}</p>
{/if}
