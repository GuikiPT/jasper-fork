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

	function base64RawFromLocation() {
		const p = new URLSearchParams(location.search);
		let raw =
			p.get('data') ??
			p.get('b64') ??
			p.get('base64') ??
			location.pathname.split('/').filter(Boolean).pop() ??
			'';
		return raw || null;
	}

	function decodeBase64Json(raw) {
		const comma = raw.indexOf(',');
		if (raw.startsWith('data:') && comma !== -1) raw = raw.slice(comma + 1);
		try {
			raw = decodeURIComponent(raw);
		} catch {}
		raw = raw.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
		const pad = raw.length % 4;
		if (pad) raw += '='.repeat(4 - pad);
		const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
		const text = new TextDecoder().decode(bytes);
		return JSON.parse(text);
	}

	onMount(async () => {
		try {
			const raw = base64RawFromLocation();
			if (!raw) return;
			const decoded = decodeBase64Json(raw);
			const blob = new Blob([JSON.stringify(decoded)], { type: 'application/json' });
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
