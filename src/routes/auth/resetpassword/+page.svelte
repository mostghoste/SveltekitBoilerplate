<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	export let data;

	$: ({ supabase } = data);

	// Extract email, token_hash, and type from query parameters
	let email = '';
	let token_hash = '';
	let type = 'recovery';

	$: {
		const params = new URLSearchParams($page.url.search);
		email = params.get('email') || '';
		token_hash = params.get('token_hash') || '';
		type = params.get('type') || 'recovery';
	}

	// Inline translations for resetting the password
	const translations = {
		en: {
			setPasswordTitle: 'Set Your New Password',
			passwordLabel: 'Password',
			confirmPasswordLabel: 'Confirm Password',
			setPasswordButton: 'Set Password',
			errorPasswordsMismatch: 'Passwords do not match.',
			passwordSetSuccess: 'Password reset successfully! You are now logged in!',
			validation: {
				length: 'Password must be at least 8 characters long',
				match: 'Passwords must match'
			}
		},
		ru: {
			setPasswordTitle: 'Установите новый пароль',
			passwordLabel: 'Пароль',
			confirmPasswordLabel: 'Подтвердите пароль',
			setPasswordButton: 'Установить пароль',
			errorPasswordsMismatch: 'Пароли не совпадают.',
			passwordSetSuccess: 'Пароль успешно изменён! Вы теперь вошли в систему!',
			validation: {
				length: 'Пароль должен содержать не менее 8 символов',
				match: 'Пароли должны совпадать'
			}
		},
		lt: {
			setPasswordTitle: 'Nustatykite naują slaptažodį',
			passwordLabel: 'Slaptažodis',
			confirmPasswordLabel: 'Patvirtinkite slaptažodį',
			setPasswordButton: 'Nustatyti slaptažodį',
			errorPasswordsMismatch: 'Slaptažodžiai nesutampa.',
			passwordSetSuccess: 'Slaptažodis sėkmingai pakeistas! Jūs dabar prisijungėte!',
			validation: {
				length: 'Slaptažodis turi būti ne trumpesnis nei 8 simboliai',
				match: 'Slaptažodžiai turi sutapti'
			}
		}
	};

	// Current language state (default: English)
	let currentLang = 'en';
	$: t = translations[currentLang];

	// Load saved language (if any)
	onMount(() => {
		const storedLang = localStorage.getItem('selectedLang');
		if (storedLang && translations[storedLang]) {
			currentLang = storedLang;
		}
	});

	function setLanguage(lang) {
		currentLang = lang;
		localStorage.setItem('selectedLang', lang);
	}

	let password = '';
	let confirmPassword = '';
	let errorMessage = '';

	// Reactive validations
	$: isLengthValid = password.length >= 8;
	$: isMatchValid = password === confirmPassword && password.length > 0;

	async function setPasswordHandler() {
		errorMessage = '';

		// Basic validations
		if (!isLengthValid) {
			errorMessage = t.validation.length;
			return;
		}
		if (!isMatchValid) {
			errorMessage = t.errorPasswordsMismatch;
			return;
		}

		// 1. Verify the token (for 'recovery' or 'invite') using Supabase
		const { error: verifyError } = await supabase.auth.verifyOtp({
			email,
			token: token_hash,
			type
		});
		if (verifyError) {
			errorMessage = verifyError.message;
			return;
		}

		// 2. Update the user's password
		const { error: updateError } = await supabase.auth.updateUser({ password });
		if (updateError) {
			errorMessage = updateError.message;
			return;
		}

		// 3. Log in with the new password so the user is fully authenticated
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) {
			errorMessage = signInError.message;
			return;
		}

		// 4. Redirect to /products
		alert(t.passwordSetSuccess);
		goto('/products');
	}
</script>

<main class="w-full h-screen flex justify-center items-center">
	<form on:submit|preventDefault={setPasswordHandler} class="flex flex-col gap-4 border p-6 w-96">
		<!-- Language Picker -->
		<div class="flex justify-end">
			<button
				type="button"
				on:click={() => setLanguage('en')}
				class="text-2xl cursor-pointer mr-2 p-1 rounded-md"
				class:bg-base-300={currentLang === 'en'}
			>
				🇬🇧
			</button>
			<button
				type="button"
				on:click={() => setLanguage('ru')}
				class="text-2xl cursor-pointer mr-2 p-1 rounded-md"
				class:bg-base-300={currentLang === 'ru'}
			>
				🇷🇺
			</button>
			<button
				type="button"
				on:click={() => setLanguage('lt')}
				class="text-2xl cursor-pointer mr-2 p-1 rounded-md"
				class:bg-base-300={currentLang === 'lt'}
			>
				🇱🇹
			</button>
		</div>

		<h2 class="text-xl font-bold">{t.setPasswordTitle}</h2>

		<label for="password" class="font-medium">{t.passwordLabel}</label>
		<input
			class="input input-bordered"
			type="password"
			id="password"
			bind:value={password}
			required
		/>

		<label for="confirm-password" class="font-medium">{t.confirmPasswordLabel}</label>
		<input
			class="input input-bordered"
			type="password"
			id="confirm-password"
			bind:value={confirmPassword}
			required
		/>

		<!-- Validation checks -->
		<ul class="list-none pl-0 space-y-1">
			<li
				class="flex items-center"
				class:text-green-500={isLengthValid}
				class:text-red-500={!isLengthValid}
			>
				<span class="mr-2">{isLengthValid ? '✅' : '❌'}</span>{t.validation.length}
			</li>
			<li
				class="flex items-center"
				class:text-green-500={isMatchValid}
				class:text-red-500={!isMatchValid}
			>
				<span class="mr-2">{isMatchValid ? '✅' : '❌'}</span>{t.validation.match}
			</li>
		</ul>

		{#if errorMessage}
			<p class="text-red-500">{errorMessage}</p>
		{/if}

		<button class="btn btn-success" type="submit" disabled={!isLengthValid || !isMatchValid}>
			{t.setPasswordButton}
		</button>
	</form>
</main>
