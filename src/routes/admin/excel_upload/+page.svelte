<script>
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
	let file;

	const handleSubmit = async () => {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch('/excel_upload', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		if (result.success) {
			alert('Data imported successfully!');
		} else {
			alert('Failed to import data.');
		}
	};
</script>

<h1 class="font-bold">Excel upload</h1>
<p>In this page, you can export and synchronize the website database to an excel file.</p>
<p>Currently, there are:</p>
<p><b>17</b> users, <b>{2}</b> of them admins</p>
<p><b>{431}</b> active listings in <b>{18}</b> categories</p>
<p><b>{6}</b> client groups</p>

<main class="flex flex-col gap-8">
	<section class="border border-black p-1 flex flex-col gap-4 max-w-96">
		<h2 class="text-xl">Export (⚠️ Under construction)</h2>
		<form action="">
			<button class="btn btn-secondary" disabled>Export database to excel</button>
		</form>
	</section>
	<section class="border border-black p-1 flex flex-col gap-4 max-w-96">
		<h2 class="text-xl">Import</h2>
		<form action="" class="flex flex-col w-fit gap-2">
			<input type="file" bind:this={file} accept=".xlsx, .xls" />
			<button class="btn btn-secondary" on:click={handleSubmit}>Import Data from excel</button>
		</form>
	</section>
</main>
