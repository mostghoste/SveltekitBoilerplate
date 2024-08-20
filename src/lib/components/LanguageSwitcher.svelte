<script>
	import { availableLanguageTags, languageTag } from '$lib/paraglide/runtime.js';
	import { i18n } from '$lib/i18n.js';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let showDropdown = false;
	$: currentPath = $page.url.pathname;
	$: currentLanguage = languageTag();

	// Map language codes to flag URLs or emoji flags
	const flagMap = {
		en: '🇬🇧', // English
		uk: '🇺🇦', // Ukrainian
		lt: '🇱🇹', // Lithuanian
		fr: '🇫🇷', // French
		es: '🇪🇸'  // Spanish
	};

	// Close dropdown on outside click
	const handleClickOutside = (event) => {
		if (!event.target.closest('.language-picker')) {
			showDropdown = false;
		}
	};

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div class="language-picker relative inline-block">
	<button
		on:click={() => (showDropdown = !showDropdown)}
		class="btn btn-ghost"
		aria-label="Current language"
	>
	<span class="text-2xl">{flagMap[currentLanguage] || '🌐'}</span>
	</button>
	{#if showDropdown}
		<div class="dropdown-menu absolute right-0 mt-2 w-32 bg-white shadow-lg rounded-lg">
			{#each availableLanguageTags as lang}
				<a
					href={i18n.route(currentPath, lang)}
					hreflang={lang}
					aria-current={lang === currentLanguage ? 'page' : undefined}
					class="block px-4 py-2 text-gray-800 hover:bg-gray-200"
				>
					<span class="mr-2">{flagMap[lang] || '🌐'}</span>
					<span>{lang.toUpperCase()}</span>
				</a>
			{/each}
		</div>
	{/if}
</div>
