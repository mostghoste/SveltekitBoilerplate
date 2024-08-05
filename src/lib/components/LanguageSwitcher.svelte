<script>
	import { availableLanguageTags, languageTag } from '$lib/paraglide/runtime.js';
	import { i18n } from '$lib/i18n.js';
	import { page } from '$app/stores';

	$: currentPath = $page.url.pathname;
	$: currentLanguage = languageTag();
</script>

<div class="flex space-x-2">
	{#each availableLanguageTags as lang}
		<a
			href={i18n.route(currentPath, lang)}
			hreflang={lang}
			aria-current={lang === currentLanguage ? 'page' : undefined}
			class="btn btn-ghost"
		>
			{lang}
		</a>
	{/each}
</div>
