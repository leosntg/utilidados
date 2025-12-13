let filtrosAtuais = {
    instituicoes: [],
    orientador: null
};

// Função para converter dados para CSV com UTF-8
function converterParaCSV(dados) {
    if (!dados || dados.length === 0) {
        return '';
    }

    // Pega os nomes das colunas do primeiro registro
    const colunas = Object.keys(dados[0]);

    // Cria o cabeçalho
    const cabecalho = colunas.map(col => `"${col}"`).join(';');

    // Cria as linhas de dados
    const linhas = dados.map(registro => {
        return colunas.map(col => {
            let valor = registro[col] || '';
            // Escapa aspas duplas e envolve em aspas se contiver ponto e vírgula, quebra de linha ou aspas
            valor = String(valor).replace(/"/g, '""');
            if (valor.includes(';') || valor.includes('\n') || valor.includes('"')) {
                valor = `"${valor}"`;
            }
            return valor;
        }).join(';');
    });

    // Junta tudo com quebra de linha e adiciona BOM
    return '\ufeff' + cabecalho + '\n' + linhas.join('\n');
}

// Função para converter dados para CSV com apenas as colunas visíveis
function converterParaCSVFiltrado(dados, colunas) {
    if (!dados || dados.length === 0) {
        return '';
    }

    // Cria o cabeçalho com as colunas visíveis
    const cabecalho = colunas.map(col => `"${col}"`).join(';');

    // Cria as linhas de dados
    const linhas = dados.map(registro => {
        return colunas.map(col => {
            let valor = registro[col] || '';
            // Escapa aspas duplas e envolve em aspas se contiver ponto e vírgula, quebra de linha ou aspas
            valor = String(valor).replace(/"/g, '""');
            if (valor.includes(';') || valor.includes('\n') || valor.includes('"')) {
                valor = `"${valor}"`;
            }
            return valor;
        }).join(';');
    });

    // Junta tudo com quebra de linha e adiciona BOM
    return '\ufeff' + cabecalho + '\n' + linhas.join('\n');
}

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
    const orientadores = $('[data-filtro="orientadores"]').val() || [];

    filtrosAtuais.instituicoes = instituicao;
    filtrosAtuais.orientadores = orientadores;

    const params = new URLSearchParams();

    if (instituicao && instituicao.length > 0) {
        instituicao.forEach(inst => params.append('instituicao', inst));
    }

    if (orientadores && orientadores.length > 0) {
        orientadores.forEach(or => params.append('orientador', or));
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

            if (filtrosAtuais.orientadores && filtrosAtuais.orientadores.length > 0) {
                filtrosAtuais.orientadores.forEach(or => requestParams.append('orientador', or));
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
                text: 'Exportar CSV',
                className: 'btn btn-success',
                action: function(e, dt, node, config) {
                    // Desabilita o botão e adiciona loading
                    const $btn = $(node);
                    const originalHTML = $btn.html();
                    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Exportando...');

                    try {
                        // Pega os índices das colunas visíveis
                        const colunasVisiveis = dt.columns(':visible').indexes().toArray();

                        // Array com os nomes das colunas na ordem da DataTable
                        const colunasDataTable = [
                            'NM_DISCENTE',
                            'NM_ENTIDADE_ENSINO',
                            'SG_ENTIDADE_ENSINO',
                            'NM_PROGRAMA_IES',
                            'NM_ORIENTADOR_PRINCIPAL',
                            'NM_TESE_DISSERTACAO',
                            'DS_GRAU_ACADEMICO_DISCENTE',
                            'NM_SITUACAO_DISCENTE',
                            'DT_MATRICULA_DISCENTE',
                            'DT_SITUACAO_DISCENTE',
                            'AN_NASCIMENTO_DISCENTE',
                            'DS_FAIXA_ETARIA',
                            'QT_MES_TITULACAO'
                        ];

                        // Pega os nomes das colunas visíveis
                        const colunasParaExportar = colunasVisiveis.map(idx => colunasDataTable[idx]);

                        console.log('Colunas visíveis:', colunasParaExportar);

                        // Monta os parâmetros para a requisição
                        const requestParams = new URLSearchParams();

                        // Adiciona instituições dos filtros globais
                        if (filtrosAtuais.instituicoes && filtrosAtuais.instituicoes.length > 0) {
                            filtrosAtuais.instituicoes.forEach(inst => requestParams.append('instituicao', inst));
                        }

                        // Adiciona orientadores dos filtros globais
                        if (filtrosAtuais.orientadores && filtrosAtuais.orientadores.length > 0) {
                            filtrosAtuais.orientadores.forEach(or => requestParams.append('orientador', or));
                        }

                        // Busca todos os dados filtrados
                        fetch(`/api/grafos/tabela/exportar?${requestParams.toString()}`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(data => {
                                console.log('Dados recebidos para exportação:', data);

                                if (!data.data || data.data.length === 0) {
                                    alert('Nenhum dado para exportar');
                                    $btn.prop('disabled', false).html(originalHTML);
                                    return;
                                }

                                // Filtra os dados apenas com as colunas visíveis
                                const dadosFiltrados = data.data.map(registro => {
                                    const novoRegistro = {};
                                    colunasParaExportar.forEach(coluna => {
                                        novoRegistro[coluna] = registro[coluna];
                                    });
                                    return novoRegistro;
                                });

                                // Converte os dados para CSV
                                const csv = converterParaCSVFiltrado(dadosFiltrados, colunasParaExportar);

                                // Cria e dispara o download
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const link = document.createElement('a');
                                const url = URL.createObjectURL(blob);
                                link.setAttribute('href', url);
                                link.setAttribute('download', 'dados_discentes.csv');
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(url);

                                // Reabilita o botão
                                $btn.prop('disabled', false).html(originalHTML);
                            })
                            .catch(error => {
                                console.error('Erro ao exportar dados:', error);
                                alert('Erro ao exportar dados: ' + error.message);
                                // Reabilita o botão em caso de erro
                                $btn.prop('disabled', false).html(originalHTML);
                            });
                    } catch (error) {
                        console.error('Erro no processamento:', error);
                        alert('Erro no processamento: ' + error.message);
                        $btn.prop('disabled', false).html(originalHTML);
                    }
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