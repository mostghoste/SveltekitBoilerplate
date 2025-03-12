<script>
	import { goto } from '$app/navigation';
	export let data;

	// Destructure values from incoming data
	$: ({ token_hash, type, supabase } = data);

	// Inline translations
	const translations = {
		en: {
			setPasswordTitle: 'Set Your Password',
			passwordLabel: 'Password',
			confirmPasswordLabel: 'Confirm Password',
			setPasswordButton: 'Set Password',
			errorPasswordsMismatch: 'Passwords do not match.',
			passwordSetSuccess: 'Password set successfully! You are now logged in!',
			validation: {
				length: 'Password must be at least 8 characters long',
				match: 'Passwords must match'
			}
		},
		ru: {
			setPasswordTitle: 'Установите пароль',
			passwordLabel: 'Пароль',
			confirmPasswordLabel: 'Подтвердите пароль',
			setPasswordButton: 'Установить пароль',
			errorPasswordsMismatch: 'Пароли не совпадают.',
			passwordSetSuccess: 'Пароль успешно установлен! Вы теперь вошли в систему!',
			validation: {
				length: 'Пароль должен содержать не менее 8 символов',
				match: 'Пароли должны совпадать'
			}
		},
		lt: {
			setPasswordTitle: 'Sukurkite savo slaptažodį',
			passwordLabel: 'Slaptažodis',
			confirmPasswordLabel: 'Patvirtinkite slaptažodį',
			setPasswordButton: 'Nustatyti slaptažodį',
			errorPasswordsMismatch: 'Slaptažodžiai nesutampa.',
			passwordSetSuccess: 'Slaptažodis sėkmingai nustatytas! Jūs dabar prisijungėte!',
			validation: {
				length: 'Slaptažodis turi būti ne trumpesnis nei 8 simboliai',
				match: 'Slaptažodžiai turi sutapti'
			}
		}
	};

	// Current language state (default: English)
	let currentLang = 'en';
	$: t = translations[currentLang];

	// Password inputs and error message
	let password = '';
	let confirmPassword = '';
	let errorMessage = '';

	// Reactive validations
	$: isLengthValid = password.length >= 8;
	$: isMatchValid = password === confirmPassword && password.length > 0;

	async function setPassword() {
		errorMessage = '';

		// Check validations before proceeding
		if (!isLengthValid) {
			errorMessage = t.validation.length;
			return;
		}
		if (!isMatchValid) {
			errorMessage = t.errorPasswordsMismatch;
			return;
		}

		// Verify OTP with Supabase
		const { error: verifyError } = await supabase.auth.verifyOtp({
			type,
			token_hash
		});
		if (verifyError) {
			errorMessage = verifyError.message;
			return;
		}

		// Update user password with Supabase
		const { error: updateError } = await supabase.auth.updateUser({
			password
		});
		if (updateError) {
			errorMessage = updateError.message;
		} else {
			alert(t.passwordSetSuccess);
			goto('/products');
		}
	}
</script>

<main class="w-full h-screen flex justify-center items-center">
	<form on:submit|preventDefault={setPassword} class="flex flex-col gap-4 border p-6 w-96">
		<!-- Language Picker -->
		<div class="flex justify-end">
			<button
				type="button"
				on:click={() => (currentLang = 'en')}
				class="text-2xl cursor-pointer mr-2 p-1 rounded-md"
				class:bg-base-300={currentLang === 'en'}
			>
				🇬🇧
			</button>
			<button
				type="button"
				on:click={() => (currentLang = 'ru')}
				class="text-2xl cursor-pointer mr-2 p-1 rounded-md"
				class:bg-base-300={currentLang === 'ru'}
			>
				🇷🇺
			</button>
			<button
				type="button"
				on:click={() => (currentLang = 'lt')}
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

		<!-- Validation Conditions -->
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
