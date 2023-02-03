<svelte:head>
	<link rel="stylesheet" href="/src/menu.css">
</svelte:head>
<script>
	import { estado } from './estado.js'
	import { trocarEstadoDoJogo } from './estado.js'

</script>
<style>
	h1 {
		color:rgb(39, 200, 18);
		text-align: center;
		font-size: 100px;
	
		}
	.Menu {
		background-color:rgb(39, 200, 18);
		color:black;
		width: 250px;
		right: 50px;
		margin-left: 44%;
		font-size: 100px;

		}
	</style>	
<h1>
	Caça Palavras
</h1>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='Menu' on:click={() => trocarEstadoDoJogo('Jogar')}>
		Jogar
	</div>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='Menu' on:click={() => trocarEstadoDoJogo('Sobre')}>
		Sobre
	</div>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class='Menu' on:click={() => trocarEstadoDoJogo('Ajuda')}>
		Ajuda
	</div>


