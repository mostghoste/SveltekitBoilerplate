<script>
	import AgrobondLogo from '$lib/assets/images/logo.png';
</script>

<main class="flex justify-center items-center flex-col h-screen gap-2">
	<figure class="max-w-64 flex items-center gap-2 justify-center">
		<img src={AgrobondLogo} alt="Agrobond logo" />
	</figure>
	<form method="post" action="/auth?/login" class="flex flex-col gap-2 border p-4 px-8">
		<input type="email" name="email" class="input input-bordered" placeholder="Email" />
		<input type="password" name="password" class="input input-bordered" placeholder="Password" />
		<button type="submit" class="btn btn-success">Log in</button>
		<!-- <button formaction="/auth?/signup">Sign up</button> -->
	</form>
</main>
