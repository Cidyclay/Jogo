<script>
  import { estado } from './estado.js'
	import { trocarEstadoDoJogo } from './estado.js'
  let lista = ["Cidyclay Lacerda Monteiro Junyor",
                "Marcio Rodrigues De Santanna    ",
                "João Vitor Batista Rodrigues    ",
                "    Iara Cristina                   ", 
                "       Samantha Cristina               "]
</script>

<style>
  .alunos{
    color: greenyellow;
  }
  .lista{
       color:yellow
       
  }
  .prof{
    color:green
  }
  .Sobre{
    background-color: green;
    width: 70px;
	  right: 50px;
  }

</style>
<div id= prin>
  <h1 class="alunos">Alunos:</h1>
<ls><ol>
  {lista[0]}
</ol>
</ls>
<ls><ol>
  {lista[1]}
</ol>
</ls>
<ls><ol>
  {lista[2]}
</ol>
</ls>
<ls><ol>
  {lista[3]}
</ol>
</ls>
<ls><ol>
  {lista[4]}
</ol>
</ls>
<h2>Professor:</h2>
<p class="prof">Allan Lima</p>
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class='Sobre' on:click={() => trocarEstadoDoJogo('Menu')}>
	Retornar
</div>
  
</div>


