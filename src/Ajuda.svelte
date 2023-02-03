<script>
    import { estado } from "./estado";
    import { trocarEstadoDoJogo } from "./estado";
</script>
<style>
     h1{
        color:greenyellow;
     }
     p{
        color: black;
        font-style: italic;
     }
     .Voltar{
    background-color: green;
    width: 50px;
	right: 50px;
     }
    
</style>
<h1>
    Como jogar ?
</h1>
    <p>Olá jogar, para jogar este game, você irá digitar a </p>
    <p>repostas da perguntas e como ajuda você irá utilizar</p>
    <p>O caça palavras como base para achar as repostas e assim conseguir completar o game.</p>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="Voltar" on:click={() => trocarEstadoDoJogo('Menu')}>
    Voltar
</div>