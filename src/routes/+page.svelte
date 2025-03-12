<script>
	import AgrobondLogo from '$lib/assets/images/logo.png';
	import { page } from '$app/stores';

	// Inline translations with error messages
	const translations = {
		en: {
			email_placeholder: 'Enter your email',
			password_placeholder: 'Enter your password',
			login: 'Login',
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

	// Derive the error code from the URL query parameter and map it to a translated message
	$: errorCode = $page.url.searchParams.get('error');
	$: errorText = errorCode ? t.errors[errorCode] || errorCode : null;
</script>

<main class="flex flex-col justify-center items-center h-screen gap-4">
	<figure class="flex items-center gap-2 justify-center">
		<img src={AgrobondLogo} alt="Agrobond logo" class="max-w-[200px]" />
	</figure>

	{#if errorText}
		<p class="text-red-600">{errorText}</p>
	{/if}

	<form method="post" action="/auth?/login" class="flex flex-col gap-4 border p-6 px-8">
		<input
			type="email"
			name="email"
			class="input input-bordered"
			placeholder={t.email_placeholder}
		/>
		<input
			type="password"
			name="password"
			class="input input-bordered"
			placeholder={t.password_placeholder}
		/>
		<button type="submit" class="btn btn-success">{t.login}</button>
	</form>

	<!-- Language Picker -->
	<div class="flex justify-center gap-2">
		<button
			type="button"
			on:click={() => (currentLang = 'en')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'en'}
		>
			🇬🇧
		</button>
		<button
			type="button"
			on:click={() => (currentLang = 'lt')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'lt'}
		>
			🇱🇹
		</button>
		<button
			type="button"
			on:click={() => (currentLang = 'ru')}
			class="text-2xl cursor-pointer p-2 rounded"
			class:bg-base-200={currentLang === 'ru'}
		>
			🇷🇺
		</button>
	</div>
</main>
