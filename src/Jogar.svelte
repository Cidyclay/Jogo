
<script>
	import { estado }  from './estado.js'
	import { trocarEstadoDoJogo } from './estado.js'

	var name = "";
	var name1="";
	var namex="";
	var namey="";
	var num = 0;
	let errado ="Esta perto.....Será ????"

function cont () {
	num= num +1
}

	let array = [
	['x','s','p','o','r','t','h','x'],
    ['d','a','i','v','j','l','u','a'],
    ['c','n','z','r','a','l','m','e'],
    ['a','t','l','e','t','i','c','o'],
    ['f','o','y','m','w','g','u','t'],
    ['r','s','q','o','d','p','n','c']
	]
</script>
<style>
  #errado{
    color: red;
  }
#principal{
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;

}
  .tab{
	color: black;
	align-items: center;
	width: 600px;
	height: 600px;
	font-size: 4em;
  }
  .Retornar{
	position: absolute;
    bottom: -200px;
	background-color: green;
	margin-left: 10px;
	font-size: 100px;
  }
  h1{
	color: green;
  }
  .Pontuação{
	font-size: 30px;
  }
</style>

<div id = "principal">
<p class= "Pontuação">Pontuação: {num}</p>
	<h1>Descubra o time</h1>
{#if num == 0}
<p>Clube campeão da copa do brasil 2008 ?</p>
<input bind:value={name} placeholder="Digite Aqui!">
		{#if name == array[0][1]+array[0][2]+array[0][3]+array[0][4]+array[0][5]}
			<p> Parabéns voce acertou o time é sport</p>
			<button on:click={() => cont()}>Proxima palavra</button>
		{:else if name == ""}
		<p>Esperando Digitar...</p>
		{:else}
			<p id="errado">{errado}</p>
		{/if}
{/if}

{#if num == 1 } 
<p>Clube mineiro que tem como seu mascote o Galo ?</p>
<input bind:value={name1} placeholder="digite">
{#if name1 == array[3][0]+array[3][1]+array[3][2]+array[3][3]+array[3][4]+array[3][5]+array[3][6]+array[3][7]}
<p>parabéns o time é Atletico-MG</p>
<button on:click={() => cont()}>Proxima palavra</button>
{:else}
<p id="errado">{errado}</p>
 {/if}
{/if}

{#if num == 2 } 
<p>Clube paraense que tem como mascote um Leão</p>
<input bind:value={namex} placeholder="digite novamente">
{#if namex == array[2][3]+array[3][3]+array[4][3]+array[5][3]}
<p>Parabéns o time é remo</p>
<button on:click={() => cont()}>Proxima palavra</button>
{:else}
<p id="errado">{errado}</p>
 {/if}
{/if}

{#if num == 3 } 
<p>Clube paulista que teve como seu maior craque o Rei Pelé</p>
<input bind:value={namey} placeholder="digite novamente">
{#if namey == array[0][1]+array[1][1]+array[2][1]+array[3][1]+array[4][1]+array[5][1]}
<p>Parabéns o time é Santos</p>
<button on:click={() => cont()}>Proxima palavra</button>
{:else}
<p id="errado">{errado}</p>
 {/if}
{/if}

{#if num == 4}
<p>Parabéns voce acertou todas as palavras do caça palavras</p>
{:else}
<p>Você acertou {num} palavra(s)</p>
{/if}

<table class="tab">
	<tr><td>{array[0][0]}</td><td>{array[0][1]}</td><td>{array[0][2]}</td><td>{array[0][3]}</td><td>{array[0][4]}</td><td>{array[0][5]}</td><td>{array[0][6]}</td><td>{array[0][7]}</td></tr>
	<tr><td>{array[1][0]}</td><td>{array[1][1]}</td><td>{array[1][2]}</td><td>{array[1][3]}</td><td>{array[1][4]}</td><td>{array[1][5]}</td><td>{array[1][6]}</td><td>{array[1][7]}</td></tr>
	<tr><td>{array[2][0]}</td><td>{array[2][1]}</td><td>{array[2][2]}</td><td>{array[2][3]}</td><td>{array[2][4]}</td><td>{array[2][5]}</td><td>{array[2][6]}</td><td>{array[2][7]}</td></tr>
	<tr><td>{array[3][0]}</td><td>{array[3][1]}</td><td>{array[3][2]}</td><td>{array[3][3]}</td><td>{array[3][4]}</td><td>{array[3][5]}</td><td>{array[3][6]}</td><td>{array[3][7]}</td></tr>
	<tr><td>{array[4][0]}</td><td>{array[4][1]}</td><td>{array[4][2]}</td><td>{array[4][3]}</td><td>{array[4][4]}</td><td>{array[4][5]}</td><td>{array[4][6]}</td><td>{array[4][7]}</td></tr>
	<tr><td>{array[5][0]}</td><td>{array[5][1]}</td><td>{array[5][2]}</td><td>{array[5][3]}</td><td>{array[5][4]}</td><td>{array[5][5]}</td><td>{array[5][6]}</td><td>{array[5][7]}</td></tr>
</table>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="Retornar" on:click={() => trocarEstadoDoJogo('Menu')}>
	Retornar
</div>
</div>
