<script>
    import parse from "../utils/msgParser.js"
    import "./app.css"
    import '@skyra/discord-components-core';
    
    let messages = []

    function importPurged(){
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            messages = await parse(file)
        }
        input.click();
    }
</script>
<button class="button" on:click={() => importPurged()}>Import Messages</button>

<discord-messages>
{#each messages as [messageid, timestamp, username, id, content, repliedUser, repliedContent]}
	<discord-message author={`${username} (${id})`} timestamp={timestamp}>
		{#if repliedUser}
			<discord-reply slot="reply">{repliedUser}: {repliedContent}</discord-reply>
		{/if}
		{content}
	</discord-message>
{/each}
</discord-messages>