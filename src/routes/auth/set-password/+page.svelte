<script>
	import { goto } from '$app/navigation';
	export let data;
	$: ({ token_hash, type, supabase } = data);

	let password = '';
	let confirmPassword = '';
	let errorMessage = '';

	async function setPassword() {
		if (password !== confirmPassword) {
			errorMessage = 'Passwords do not match';
			return;
		}

		const { error: verifyError } = await supabase.auth.verifyOtp({
			type,
			token_hash
		});

		if (verifyError) {
			errorMessage = verifyError.message;
			return;
		}

		const { error: updateError } = await supabase.auth.updateUser({
			password
		});

		if (updateError) {
			errorMessage = updateError.message;
		} else {
			alert('Password set successfully! You are now logged in!');
			goto('/');
		}
	}
</script>

<h2 class="font-bold">Set Your Password</h2>

<form on:submit|preventDefault={setPassword}>
	<div>
		<label for="password">Password</label>
		<input
			class="input input-bordered"
			type="password"
			id="password"
			bind:value={password}
			required
		/>
	</div>
	<div>
		<label for="confirm-password">Confirm Password</label>
		<input
			class="input input-bordered"
			type="password"
			id="confirm-password"
			bind:value={confirmPassword}
			required
		/>
	</div>
	{#if errorMessage}
		<p style="color: red;">{errorMessage}</p>
	{/if}
	<button class="btn" type="submit">Set Password</button>
</form>
