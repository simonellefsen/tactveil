<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Tactveil</title>
	<meta name="description" content="A modern, client-only hidden-information strategy game. Inspired by classic tactics, built for the web and iPhone." />
</svelte:head>

{@render children()}
