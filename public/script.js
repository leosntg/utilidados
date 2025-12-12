let filtrosAtuais = {
    instituicoes: [],
    orientador: null
};

async function carregarFiltros() {
    const instituicoesSelect = $('[data-filtro="instituicoes"]');
    instituicoesSelect.select2({
        theme: 'bootstrap-5',
        width: '100%',
        placeholder: 'Selecione as instituições',
        allowClear: true,
        multiple: true,
        dropdownParent: instituicoesSelect.parent()
    });

    const orientadoresSelect = $('[data-filtro="orientadores"]');
    orientadoresSelect.select2({
        theme: 'bootstrap-5',
        width: '100%',
        placeholder: 'Selecione os orientadores',
        multiple: true,
        allowClear: true,
        dropdownParent: orientadoresSelect.parent()
    });

    const instResponse = await fetch('/api/filtros/instituicoes');
    const instData = await instResponse.json();
    const instOptions = instData.records.map(record => {
        const valor = record._fields[0].properties.NM_ENTIDADE_ENSINO;
        return new Option(valor, valor, false, false);
    });
    instituicoesSelect.append(instOptions).trigger('change');

    instituicoesSelect.on('change', async function() {
        const selectedInst = $(this).val();
        orientadoresSelect.empty();
        filtrosAtuais.instituicoes = selectedInst || [];

        if (selectedInst && selectedInst.length > 0) {
            try {
                const params = new URLSearchParams();
                selectedInst.forEach(inst => params.append('instituicoes', inst));

                const response = await fetch('/api/filtros/orientadores?' + params.toString());
                const data = await response.json();

                const options = data.records.map(record => {
                    const valor = record._fields[0].properties.NM_ORIENTADOR_PRINCIPAL;
                    return new Option(valor, valor, false, false);
                });

                orientadoresSelect.append(options);
            } catch (error) {
                console.error('Erro ao carregar orientadores:', error);
            }
        }
        orientadoresSelect.trigger('change');
    });
}
document.addEventListener('DOMContentLoaded', carregarFiltros);

document.querySelector('.js-filtros button').addEventListener('click', async function (event) {
    event.preventDefault();

    this.disabled = true;

    const instituicao = $('[data-filtro="instituicoes"]').val() || [];
    const orientador = $('[data-filtro="orientadores"]').val()?.[0] || null;

    filtrosAtuais.instituicoes = instituicao;
    filtrosAtuais.orientador = orientador;

    const params = new URLSearchParams();

    if (instituicao && instituicao.length > 0) {
        instituicao.forEach(inst => params.append('instituicao', inst));
    }

    if (orientador) {
        params.append('orientador', orientador);
    }

    await obterGrafos(`/api/grafos?${params.toString()}`);

    this.disabled = false;
});

$(document).ready(function() {
    const table = $('#tabela-dados').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/pt-BR.json'
        },
        serverSide: true,
        processing: true,
        ajax: function(data, callback, settings) {
            const requestParams = new URLSearchParams();

            if (filtrosAtuais.instituicoes && filtrosAtuais.instituicoes.length > 0) {
                filtrosAtuais.instituicoes.forEach(inst => requestParams.append('instituicao', inst));
            }

            if (filtrosAtuais.orientador) {
                requestParams.append('orientador', filtrosAtuais.orientador);
            }

            requestParams.append('draw', data.draw);
            requestParams.append('start', data.start);
            requestParams.append('length', data.length);

            console.log('Requisição da tabela:', requestParams.toString());

            fetch(`/api/grafos/tabela/paginada?${requestParams.toString()}`)
                .then(response => response.json())
                .then(data => callback(data))
                .catch(error => {
                    console.error('Erro ao carregar dados:', error);
                    callback({ data: [], draw: data.draw, recordsTotal: 0, recordsFiltered: 0 });
                });
        },
        columns: [
            { data: 'NM_DISCENTE', title: 'Nome do Discente' },
            { data: 'NM_ENTIDADE_ENSINO', title: 'Instituição de Ensino' },
            { data: 'SG_ENTIDADE_ENSINO', title: 'Sigla Instituição' },
            { data: 'NM_PROGRAMA_IES', title: 'Programa IES' },
            { data: 'NM_ORIENTADOR_PRINCIPAL', title: 'Orientador Principal' },
            { data: 'NM_TESE_DISSERTACAO', title: 'Título do Trabalho' },
            { data: 'DS_GRAU_ACADEMICO_DISCENTE', title: 'Grau Acadêmico' },
            { data: 'NM_SITUACAO_DISCENTE', title: 'Situação do Discente' },
            { data: 'DT_MATRICULA_DISCENTE', title: 'Data de Matrícula' },
            { data: 'DT_SITUACAO_DISCENTE', title: 'Data da Situação' },
            { data: 'AN_NASCIMENTO_DISCENTE', title: 'Ano de Nascimento' },
            { data: 'DS_FAIXA_ETARIA', title: 'Faixa Etária' },
            { data: 'QT_MES_TITULACAO', title: 'Meses até Titulação' }
        ],
        dom: '<"d-flex justify-content-between"lB>rtip',
        buttons: [
            {
                extend: 'colvis',
                text: 'Selecionar Colunas',
                className: 'btn btn-primary'
            },
            {
                extend: 'csv',
                text: 'Exportar CSV',
                className: 'btn btn-success',
                exportOptions: {
                    columns: ':visible'
                },
                charset: 'UTF-8',
                bom: true,
                customize: function(csv) {
                    return '\ufeff' + csv;
                }
            }
        ],
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Todos"]],
        pageLength: 25,
        responsive: true
    });

});

document.addEventListener('DOMContentLoaded', async function () {
    const response = await fetch('/api/grafos');
    const data = await response.json();

    console.log('Dados recebidos:', data);

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
});

async function obterGrafos(url) {
    const response = await fetch(url);
    const data = await response.json();

    console.log('Dados recebidos:', data);

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

    const table = $('#tabela-dados').DataTable();
    table.ajax.reload();
}