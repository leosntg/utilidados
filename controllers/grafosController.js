const driver = require('../database/neo4j');

const grafosController = {
    index: async (req, res) => {
        const { instituicao, orientador } = req.query;

        const session = driver.session();

        try {
            const result = await session.run(`
            MATCH (d:Discente)-[:INSTITUICAO]->(i:Instituicao), (d)-[:CURSO]->(c:Curso), (d)-[:ORIENTADOR]->(o:Orientador)
            WHERE
                ($instituicao IS NULL OR i.NM_ENTIDADE_ENSINO = $instituicao) AND
                ($orientador IS NULL OR o.NM_ORIENTADOR_PRINCIPAL = $orientador)
            RETURN d, i, c, o
            LIMIT 100
            `, {
                instituicao: instituicao?.trim() || null,
                orientador: orientador?.trim() || null
            });

            const nodeSet = new Set();
            const nodes = [];
            const edges = [];

            const gerarTitle = (propriedades) => {
                return Object.entries(propriedades)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
            };

            result.records.forEach(record => {
                const discente = record.get('d');
                const instituicao = record.get('i');
                const curso = record.get('c');
                const orientador = record.get('o');

                const discenteId = discente.identity.toString();
                const instituicaoId = instituicao.identity.toString();
                const cursoId = curso.identity.toString();
                const orientadorId = orientador.identity.toString();

                if (!nodeSet.has(discenteId)) {
                    nodes.push({ id: discenteId, label: discente.properties.NM_DISCENTE, title: gerarTitle(discente.properties), color: { background: '#C990C0', border: '#B261A5' } });

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

            return res.json({ nodes, edges });
        } catch (error) {
            console.error(`Erro ao consultar o banco de dados: ${error}`);

            return res.status(500).json({ mensagem: 'Erro no servidor ao processar a consulta.' });
        } finally {
            await session.close();
        }
    }
}

module.exports = grafosController;