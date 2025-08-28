export function markdownToDiscordWebComponents(markdown, rolesMap = {}) {
	if (markdown == null) return '';
	const newLineElement = '<div></div>';
	const linkEscapedMarkdown = String(markdown).replaceAll('_ _', '<br/>');
	const lines = linkEscapedMarkdown.split('\n');
	const result = [];

	let isParsingInsideCodeBlock = false;
	let codeBlockLines = [];
	let language = null;

	for (const element of lines) {
		const raw = element;

		if (raw.startsWith('```')) {
			if (isParsingInsideCodeBlock) {
				const codeBlock = `<discord-code multiline language="${language || ''}">` + codeBlockLines.join('\n') + '\n</discord-code>';
				result.push(codeBlock);
				result.push(newLineElement);
				codeBlockLines = [];
				language = null;
				isParsingInsideCodeBlock = false;
			} else {
				language = raw.slice(3).trim() || '';
				isParsingInsideCodeBlock = true;
			}
			continue;
		}

		if (isParsingInsideCodeBlock) {
			codeBlockLines.push(raw);
			continue;
		}

		let replacedElement = raw;

		replacedElement = replacedElement.replace(/^(-#) (.+)$/, '<discord-subscript>$2</discord-subscript>');
		replacedElement = replacedElement.replace(/^(#{1,3})\s+(.+)$/, (m, hashes, text) => `<discord-header level="${hashes.length}">${text}</discord-header>`);
		replacedElement = replacedElement.replace(/^(>{1,3})\s+(.+)$/, '<discord-quote>$2</discord-quote>');

		replacedElement = replacedElement.replace(/\*\*(.+?)\*\*/g, '<discord-bold>$1</discord-bold>');
		replacedElement = replacedElement.replace(/\*(.+?)\*/g, '<discord-italic>$1</discord-italic>');
		replacedElement = replacedElement.replace(/__(.+?)__/g, '<discord-underlined>$1</discord-underlined>');
		replacedElement = replacedElement.replace(/_(.+?)_/g, '<discord-underlined>$1</discord-underlined>');
		replacedElement = replacedElement.replace(/\|\|(.+?)\|\|/g, '<discord-spoiler>$1</discord-spoiler>');
		replacedElement = replacedElement.replace(/`{1,2}(.+?)`{1,2}/g, '<discord-code>$1</discord-code>');

		replacedElement = replacedElement.replace(/\[([^\]]+)\]\(<([^>]+)>\)/g, '<discord-link href="$2" target="_blank" rel="noreferrer">$1</discord-link>');

		replacedElement = replacedElement.replace(/<(t:\d+:[tTdDfFR])>/g, '<discord-time>&lt;$1&gt;</discord-time>');
		replacedElement = replacedElement.replace(/<\/(\w+):\d{18,21}>/g, '<discord-mention type="slash">$1</discord-mention>');
		replacedElement = replacedElement.replace(/<@(\d{18,21})>/g, '<discord-mention type="user">$1</discord-mention>');
		replacedElement = replacedElement.replace(/<#(\d{18,21})>/g, '<discord-mention type="channel">$1</discord-mention>');
		replacedElement = replacedElement.replace(/<@&(\d{18,21})>/g, (m, p1) => {
			const roleLabel = rolesMap[p1];
			return `<discord-mention type="role">${roleLabel ?? p1}</discord-mention>`;
		});

		result.push(replacedElement);
		result.push(newLineElement);
	}

	return result.join('\n');
}
