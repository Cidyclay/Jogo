<script>
	import Jogar from "./Jogar.svelte";
	import Menu from "./Menu.svelte";
	import {estado} from './estado.js'
</script>
{#if $estado === 'Menu'}
	<Menu/>
{:else if $estado === 'Jogar'}
	<Jogar/>
{/if}