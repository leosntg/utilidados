const driver = require('../database/neo4j');

const grafosController = {
    index: async (req, res) => {
        let { instituicao, orientador } = req.query;

        // Converte instituicao para array se for string
        if (instituicao && !Array.isArray(instituicao)) {
            instituicao = [instituicao];
        }

        const session = driver.session();

        try {
            console.log('Parâmetros recebidos:', { instituicao, orientador });

            // Query para a tabela (sem limite)
            const resultTabela = await session.run(`
            MATCH (d:Discente)-[:INSTITUICAO]->(i:Instituicao),
                  (d)-[:CURSO]->(c:Curso),
                  (d)-[:ORIENTADOR]->(o:Orientador)
            WHERE
                (size($instituicoes) = 0 OR i.NM_ENTIDADE_ENSINO IN $instituicoes) AND
                (coalesce($orientador, '') = '' OR o.NM_ORIENTADOR_PRINCIPAL = $orientador)
            WITH d, i, c, o
            ORDER BY d.NM_DISCENTE
            RETURN d, i, c, o`, {
                instituicoes: instituicao || [],
                orientador: orientador || null
            });

            // Query para o grafo (limitada a 100)
            const resultGrafo = await session.run(`
            MATCH (d:Discente)-[:INSTITUICAO]->(i:Instituicao),
                  (d)-[:CURSO]->(c:Curso),
                  (d)-[:ORIENTADOR]->(o:Orientador)
            WHERE
                (size($instituicoes) = 0 OR i.NM_ENTIDADE_ENSINO IN $instituicoes) AND
                (coalesce($orientador, '') = '' OR o.NM_ORIENTADOR_PRINCIPAL = $orientador)
            WITH d, i, c, o
            ORDER BY d.NM_DISCENTE
            LIMIT 100
            RETURN d, i, c, o`, {
                instituicoes: instituicao || [],
                orientador: orientador || null
            });

            const nodeSet = new Set();
            const nodes = [];
            const edges = [];

            const gerarTitle = (propriedades, extras = {}) => {
                return Object.entries({ ...propriedades, ...extras })
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
            };

            // Processa os dados para o grafo
            resultGrafo.records.forEach(record => {
                const discente = record.get('d');
                const instituicao = record.get('i');
                const curso = record.get('c');
                const orientador = record.get('o');

                // Adiciona a instituição nas propriedades do discente
                const discenteProps = {
                    ...discente.properties,
                    NM_ENTIDADE_ENSINO: instituicao.properties.NM_ENTIDADE_ENSINO
                };

                const discenteId = discente.identity.toString();
                const instituicaoId = instituicao.identity.toString();
                const cursoId = curso.identity.toString();
                const orientadorId = orientador.identity.toString();

                if (!nodeSet.has(discenteId)) {
                    nodes.push({
                        id: discenteId,
                        label: discente.properties.NM_DISCENTE,
                        title: gerarTitle(discenteProps),
                        color: { background: '#C990C0', border: '#B261A5' }
                    });

                    nodeSet.add(discenteId);
                }

                if (!nodeSet.has(instituicaoId)) {
                    nodes.push({ id: instituicaoId, label: instituicao.properties.NM_ENTIDADE_ENSINO, title: gerarTitle(instituicao.properties), color: { background: '#A5ABB6', border: '#9BA2AD' } });

                    nodeSet.add(instituicaoId);
                }

                if (!nodeSet.has(cursoId)) {
                    nodes.push({ id: cursoId, label: curso.properties.NM_AREA_AVALIACAO, title: gerarTitle(curso.properties), color: { background: '#FFC454', border: '#D7A013' } });

                    nodeSet.add(cursoId);
                }

                if (!nodeSet.has(orientadorId)) {
                    nodes.push({ id: orientadorId, label: orientador.properties.NM_ORIENTADOR_PRINCIPAL, title: gerarTitle(orientador.properties), color: { background: '#569480', border: '#447666' } });

                    nodeSet.add(orientadorId);
                }

                edges.push({ from: discenteId, to: instituicaoId });
                edges.push({ from: discenteId, to: cursoId });
                edges.push({ from: discenteId, to: orientadorId });
            });

            // Processa os dados para a tabela
            const tableData = resultTabela.records.map(record => {
                const discente = record.get('d');
                const instituicao = record.get('i');
                const orientador = record.get('o');

                return {
                    NM_DISCENTE: discente.properties.NM_DISCENTE || 'Não informado',
                    NM_ENTIDADE_ENSINO: instituicao.properties.NM_ENTIDADE_ENSINO || 'Não informado',
                    NM_ORIENTADOR_PRINCIPAL: orientador.properties.NM_ORIENTADOR_PRINCIPAL || 'Não informado',
                    NM_TESE_DISSERTACAO: discente.properties.NM_TESE_DISSERTACAO || 'Não informado',
                    DS_GRAU_ACADEMICO_DISCENTE: discente.properties.DS_GRAU_ACADEMICO_DISCENTE || 'Não informado',
                    NM_SITUACAO_DISCENTE: discente.properties.NM_SITUACAO_DISCENTE || 'Não informado',
                    DT_MATRICULA_DISCENTE: discente.properties.DT_MATRICULA_DISCENTE || 'Não informado',
                    DT_SITUACAO_DISCENTE: discente.properties.DT_SITUACAO_DISCENTE || 'Não informado',
                    AN_NASCIMENTO_DISCENTE: discente.properties.AN_NASCIMENTO_DISCENTE || 'Não informado',
                    DS_FAIXA_ETARIA: discente.properties.DS_FAIXA_ETARIA || 'Não informado',
                    QT_MES_TITULACAO: discente.properties.QT_MES_TITULACAO || 'Não informado'
                };
            });

            return res.json({
                nodes,
                edges,
                tableData
            });
        } catch (error) {
            console.error(`Erro ao consultar o banco de dados: ${error}`);

            return res.status(500).json({ mensagem: 'Erro no servidor ao processar a consulta.' });
        } finally {
            await session.close();
        }
    }
}

module.exports = grafosController;