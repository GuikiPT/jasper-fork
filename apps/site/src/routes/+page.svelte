<script>
	import parse from '../utils/msgParser.js';
	import './app.css';
	import '@skyra/discord-components-core';
	import { markdownToDiscordWebComponents } from '$lib/markdownToDiscordWebComponents';

	let messages = [];

	$: groupedMessages = (() => {
		// Group consecutive messages by same username+id
		const groups = [];
		for (const [
			messageid,
			timestamp,
			username,
			id,
			content,
			repliedUser,
			repliedContent
		] of messages) {
			const last = groups[groups.length - 1];
			const authorId = id; // keep the id provided (may be author id or message id)
			// Group when the username is the same or when the group's stored authorId matches
			if (last && (last.username === username || last.authorId === authorId)) {
				last.items.push({ messageid, timestamp, content, repliedUser, repliedContent });
				// update group's timestamp to the latest message's timestamp
				last.timestamp = timestamp;
			} else {
				groups.push({
					username,
					authorId,
					items: [{ messageid, timestamp, content, repliedUser, repliedContent }],
					timestamp
				});
			}
		}
		return groups;
	})();

	function truncate(text, max = 70) {
		if (text == null) return '';
		const s = String(text);
		return s.length > max ? s.slice(0, max) + '...' : s;
	}

	function importPurged() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (event) => {
			const file = event.target.files[0];
			messages = await parse(file);
		};
		input.click();
	}
</script>

<button class="button" on:click={() => importPurged()}>Import Messages</button>

<discord-messages>
	{#each groupedMessages as group}
		{#each group.items as item, idx}
			{#if idx === 0}
				<discord-message
					author={`${group.username} (${group.authorId ?? group.id})`}
					timestamp={item.timestamp}
				>
					{#if item.repliedUser}
						<discord-reply author={item.repliedUser} slot="reply">
							{@html markdownToDiscordWebComponents(
								truncate(item.repliedContent, 70)
							)}
						</discord-reply>
					{/if}
					{@html markdownToDiscordWebComponents(item.content)}
				</discord-message>
			{:else}
				<discord-message message-body-only timestamp={item.timestamp}>
					{#if item.repliedUser}
						<discord-reply author={item.repliedUser} slot="reply">
							{@html markdownToDiscordWebComponents(
								truncate(item.repliedContent, 70)
							)}
						</discord-reply>
					{/if}
					{@html markdownToDiscordWebComponents(item.content)}
				</discord-message>
			{/if}
		{/each}
	{/each}
</discord-messages>
