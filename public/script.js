document.querySelectorAll('.js-filtros select').forEach(function (select) {
    select.addEventListener('click', async function () {
        const option = {
            instituicoes: 'NM_ENTIDADE_ENSINO',
            orientadores: 'NM_ORIENTADOR_PRINCIPAL'
        };

        const filtro = select.dataset.filtro;

        const html = document.querySelector(`[data-filtro="${filtro}"]`);

        if (html.length > 1) return;

        const response = await fetch(`/api/filtros/${filtro}`);

        const data = await response.json();

        let options = '';

        for (let i in data.records) {
            const value = data.records[i]._fields[0].properties[option[filtro]];

            options += `<option value="${value}">${value}</option>`;
        }

        html.insertAdjacentHTML('beforeend', options);
    });
});

document.querySelector('.js-filtros button').addEventListener('click', async function (event) {
    event.preventDefault();

    this.disabled = true;

    const instituicao = document.querySelector('[data-filtro="instituicoes"]').value;
    const orientador = document.querySelector('[data-filtro="orientadores"]').value;

    const params = new URLSearchParams({
        instituicao,
        orientador
    });

    await obterGrafos(`/api/grafos?${params.toString()}`);

    this.disabled = false;
});

document.addEventListener('DOMContentLoaded', async function () {
    await obterGrafos('/api/grafos');
});

async function obterGrafos(url) {
    const response = await fetch(url);

    const data = await response.json();

    const grafos = document.getElementById('grafos');

    new vis.Network(grafos, { nodes: data.nodes, edges: data.edges }, {
        nodes: {
            shape: 'dot'
        },
        physics: {
            enabled: true,
            solver: 'forceAtlas2Based',
            stabilization: {
                iterations: 100,
                updateInterval: 25
            }
        }
    });
}