<script>
	import Jogar from "./Jogar.svelte";
	import Menu from "./Menu.svelte";
	import {estado} from './estado.js'
	import Sobre from "./Sobre.svelte"
	import Ajuda from "./Ajuda.svelte";
</script>
{#if $estado === 'Menu'}
	<Menu/>
{:else if $estado === 'Jogar'}
	<Jogar/>
{:else if $estado === 'Sobre'}
	<Sobre/>
{:else if $estado === 'Ajuda'}
 		<Ajuda/>
{/if}