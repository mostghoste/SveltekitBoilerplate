<script>
	import * as m from '$lib/paraglide/messages.js';

	/** @type {import('./$types').PageData} */
	export let data;
</script>

<h1 class="font-bold">Excel upload</h1>
<p>In this page, you can export and synchronize the website database to an excel file.</p>
<p>Currently, there are:</p>
<p><b>17</b> users, <b>{2}</b> of them admins</p>
<p><b>{431}</b> active listings in <b>{18}</b> categories</p>
<p><b>{6}</b> client groups</p>

<footer>
	<button class="btn btn-secondary">Export database to excel</button>
	<button class="btn btn-secondary">Import database from excel</button>
</footer>
