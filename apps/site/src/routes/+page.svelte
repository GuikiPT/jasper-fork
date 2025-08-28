<script>
	import { onMount } from 'svelte';
	import parse from '../utils/msgParser.js';
	import './app.css';
	import '@skyra/discord-components-core';
	import { markdownToDiscordWebComponents } from '$lib/markdownToDiscordWebComponents';

	let messages = [];
	let error = '';

	const truncate = (t, max = 70) => {
		if (t == null) return '';
		const s = String(t);
		return s.length > max ? s.slice(0, max) + '...' : s;
	};

	async function importPurged() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			try {
				const file = e.target.files?.[0];
				if (!file) return;
				messages = await parse(file);
				error = '';
			} catch (err) {
				error = `Failed to read file: ${err?.message ?? err}`;
			}
		};
		input.click();
	}

	onMount(async () => {
		try {
			const params = new URLSearchParams(location.search);
			const src = params.get('src');
			if (!src) return;
			const res = await fetch(src);
			if (!res.ok) throw new Error(`Failed to fetch src: ${res.status} ${res.statusText}`);
			const text = await res.text();
			const blob = new Blob([text], { type: 'application/json' });
			const file = new File([blob], 'payload.json', { type: 'application/json' });
			messages = await parse(file);
			error = '';
		} catch (e) {
			error = String(e.message ?? e);
		}
	});

	$: groupedMessages = messages.reduce((groups, row) => {
		const [messageid, timestamp, username, id, content, repliedUser, repliedContent] = row;
		const authorId = id;
		const last = groups[groups.length - 1];
		if (last && (last.username === username || last.authorId === authorId)) {
			last.items.push({ messageid, timestamp, content, repliedUser, repliedContent });
			last.timestamp = timestamp;
		} else {
			groups.push({
				username,
				authorId,
				items: [{ messageid, timestamp, content, repliedUser, repliedContent }],
				timestamp
			});
		}
		return groups;
	}, []);
</script>

<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem">
	<button type="button" class="button" on:click={importPurged}>Import Messages (file)</button>
</div>

{#if error}
	<div style="color:crimson; margin-bottom:0.5rem">{error}</div>
{/if}

<discord-messages>
	{#each groupedMessages as group}
		{#each group.items as item, idx}
			{#if idx === 0}
				<discord-message
					author={`${group.username} (${group.authorId ?? ''})`}
					timestamp={item.timestamp}
				>
					{#if item.repliedUser}
						<discord-reply author={item.repliedUser} slot="reply">
							{@html markdownToDiscordWebComponents(truncate(item.repliedContent))}
						</discord-reply>
					{/if}
					{@html markdownToDiscordWebComponents(item.content)}
				</discord-message>
			{:else}
				<discord-message message-body-only timestamp={item.timestamp}>
					{#if item.repliedUser}
						<discord-reply author={item.repliedUser} slot="reply">
							{@html markdownToDiscordWebComponents(truncate(item.repliedContent))}
						</discord-reply>
					{/if}
					{@html markdownToDiscordWebComponents(item.content)}
				</discord-message>
			{/if}
		{/each}
	{/each}
</discord-messages>
