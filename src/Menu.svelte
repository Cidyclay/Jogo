<svelte:head>
	<link rel="stylesheet" href="/src/menu.css">
</svelte:head>
<script>
	import { estado } from './estado.js'
	import { trocarEstadoDoJogo } from './estado.js'

</script>

<h1>
	Caça palavras
</h1>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='Menu' on:click={() => trocarEstadoDoJogo('Jogar')}>
		Jogar
	</div>

<style>
h1 {
	color:rgb(39, 200, 18);
	text-align: center;
	}
.Menu {
	background-color:rgb(39, 200, 18);
	color:beige;
	width: 50px;
	right: 15px;
	margin-left: 50%;
	}
</style>

