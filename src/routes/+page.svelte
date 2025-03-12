<script>
	import AgrobondLogo from '$lib/assets/images/logo.png';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { createClient } from '@supabase/supabase-js';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	// Create the Supabase client for frontend use
	const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

	// Inline translations with error messages and reset texts
	const translations = {
		en: {
			email_placeholder: 'Enter your email',
			password_placeholder: 'Enter your password',
			login: 'Login',
			forgot_password: 'Forgot password?',
			reset_instructions_h1: 'Forgot your password?',
			reset_instructions_p:
				"Type in your email address and we'll send you a recovery email shortly.",
			send_reset_email: 'Send reset email',
			reset_confirmation: 'A recovery email has been sent to your inbox.',
			back_to_login: 'Back to login',
			loading: 'Sending...',
			errors: {
				INVALID_CREDENTIALS: 'Login failed. Invalid login credentials.',
				EMAIL_REQUIRED: 'Login failed. Email is required.',
				UNKNOWN_ERROR: 'Login failed. Unknown error.'
			}
		},
		ru: {
			email_placeholder: 'Введите email',
			password_placeholder: 'Введите пароль',
			login: 'Войти',
			forgot_password: 'Забыли пароль?',
			reset_instructions_h1: 'Забыли пароль?',
			reset_instructions_p: 'Введите ваш email, и мы отправим вам письмо для восстановления.',
			send_reset_email: 'Отправить письмо для восстановления',
			reset_confirmation: 'Письмо для восстановления отправлено на ваш почтовый ящик.',
			back_to_login: 'Назад к входу',
			loading: 'Отправка...',
			errors: {
				INVALID_CREDENTIALS: 'Вход не выполнен. Неверные учетные данные.',
				EMAIL_REQUIRED: 'Вход не выполнен. Требуется указание email.',
				UNKNOWN_ERROR: 'Вход не выполнен. Неизвестная ошибка.'
			}
		},
		lt: {
			email_placeholder: 'Įveskite savo el. paštą',
			password_placeholder: 'Įveskite slaptažodį',
			login: 'Prisijungti',
			forgot_password: 'Pamiršote slaptažodį?',
			reset_instructions_h1: 'Pamiršote slaptažodį?',
			reset_instructions_p:
				'Įveskite savo el. paštą ir mes atsiųsime jums laišką su atkūrimo instrukcijomis.',
			send_reset_email: 'Siųsti atkūrimo laišką',
			reset_confirmation: 'Atkūrimo laiškas išsiųstas į jūsų pašto dėžutę.',
			back_to_login: 'Atgal prie prisijungimo',
			loading: 'Siunčiama...',
			errors: {
				INVALID_CREDENTIALS: 'Prisijungimas nepavyko. Neteisingi prisijungimo duomenys.',
				EMAIL_REQUIRED: 'Prisijungimas nepavyko. Įveskite el. paštą.',
				UNKNOWN_ERROR: 'Prisijungimas nepavyko. Nežinoma klaida.'
			}
		}
	};

	// Current language state (default: English)
	let currentLang = 'en';
	$: t = translations[currentLang];

	// On mount, try to load the selected language from localStorage
	onMount(() => {
		const storedLang = localStorage.getItem('selectedLang');
		if (storedLang && translations[storedLang]) {
			currentLang = storedLang;
		}
	});

	// Function to update language and store it in localStorage
	function setLanguage(lang) {
		currentLang = lang;
		localStorage.setItem('selectedLang', lang);
	}

	// Derive the error code from the URL query parameter and map it to a translated message (for login mode)
	$: errorCode = $page.url.searchParams.get('error');
	$: errorText = errorCode ? t.errors[errorCode] || errorCode : null;

	// Mode state: 'login' or 'reset'
	let mode = 'login';

	// State for login form inputs
	let loginEmail = '';
	let loginPassword = '';

	// Reactive validation for login form: both fields must be non-empty
	$: loginValid = loginEmail.trim() !== '' && loginPassword.trim() !== '';

	// State for the reset email input
	let resetEmail = '';

	// Reactive validation for reset form: email must be non-empty
	$: resetValid = resetEmail.trim() !== '';

	// State to trigger confirmation modal (for a sent reset email)
	let resetConfirmation = false;
	let resetError = '';

	// Loading state for sending the reset email
	let isSending = false;

	// Handle reset form submission: call Supabase to send a password reset email
	async function handleResetSubmit(event) {
		event.preventDefault();
		resetError = '';
		isSending = true; // Start loading
		try {
			const { data, error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
				redirectTo: '/update-password'
			});
			if (error) {
				resetError = error.message;
			} else {
				resetConfirmation = true;
			}
		} catch (err) {
			resetError = err.message;
		} finally {
			isSending = false; // End loading
		}
	}

	// Switch back to login mode
	function switchToLogin() {
		mode = 'login';
	}

	// Switch to reset mode
	function switchToReset() {
		mode = 'reset';
	}
</script>

<main class="flex flex-col justify-center items-center h-screen gap-4">
	<figure class="flex items-center gap-2 justify-center">
		<img src={AgrobondLogo} alt="Agrobond logo" class="max-w-[200px]" />
	</figure>

	{#if mode === 'login'}
		{#if errorText}
			<p class="text-red-600">{errorText}</p>
		{/if}
		<form method="post" action="/auth?/login" class="flex flex-col gap-4 border p-6 px-8">
			<input
				type="email"
				name="email"
				class="input input-bordered"
				placeholder={t.email_placeholder}
				bind:value={loginEmail}
			/>
			<input
				type="password"
				name="password"
				class="input input-bordered"
				placeholder={t.password_placeholder}
				bind:value={loginPassword}
			/>
			<button type="submit" class="btn btn-success" disabled={!loginValid}>{t.login}</button>
		</form>
		<p class="underline cursor-pointer text-sm" on:click={switchToReset}>
			{t.forgot_password}
		</p>
	{:else if mode === 'reset'}
		<form on:submit={handleResetSubmit} class="flex flex-col gap-4 border p-6 px-8">
			<h1 class="text-xl font-bold">{t.reset_instructions_h1}</h1>
			<p class="max-w-96">{t.reset_instructions_p}</p>
			<input
				type="email"
				name="email"
				class="input input-bordered"
				placeholder={t.email_placeholder}
				bind:value={resetEmail}
			/>
			<button
				type="submit"
				class="btn btn-success flex items-center gap-2"
				disabled={!resetValid || isSending}
			>
				{#if isSending}
					<!-- Show a loading indicator or text -->
					<span class="loader"></span>
					{t.loading}
				{:else}
					{t.send_reset_email}
				{/if}
			</button>
			{#if resetError}
				<p class="text-red-600">{resetError}</p>
			{/if}
		</form>
		<p class="underline cursor-pointer text-sm" on:click={switchToLogin}>
			{t.back_to_login}
		</p>
	{/if}

	<!-- Language Picker -->
	<div class="flex justify-center gap-2">
		<button
			type="button"
			on:click={() => setLanguage('en')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'en'}
		>
			🇬🇧
		</button>
		<button
			type="button"
			on:click={() => setLanguage('lt')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'lt'}
		>
			🇱🇹
		</button>
		<button
			type="button"
			on:click={() => setLanguage('ru')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'ru'}
		>
			🇷🇺
		</button>
	</div>

	{#if resetConfirmation}
		<!-- Simple Confirmation Modal -->
		<div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
			<div class="bg-white p-6 rounded shadow">
				<p>{t.reset_confirmation}</p>
				<footer class="flex justify-center">
					<button
						class="btn btn-success mt-4"
						on:click={() => {
							resetConfirmation = false;
							switchToLogin();
						}}
					>
						{t.back_to_login}
					</button>
				</footer>
			</div>
		</div>
	{/if}
</main>

<style>
	.loader {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
