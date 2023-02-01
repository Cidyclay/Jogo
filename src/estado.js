import { writable } from 'svelte/store'


export let estado = writable('Menu')

export function trocarEstadoDoJogo(novoEstado) {
	estado.set(novoEstado)
}