const driver = require('../database/neo4j');

const filtrosController = {
    index: async (req, res) => {
        const filtro = req.params.filtro;

        const session = driver.session();

        const filtros = {
            instituicoes: async () => {
                return await session.run('MATCH (i:Instituicao) RETURN i ORDER BY i.NM_ENTIDADE_ENSINO');
            },
            orientadores: async () => {
                const { instituicoes } = req.query;
                let query = 'MATCH (o:Orientador)<-[:ORIENTADOR]-(d:Discente)-[:INSTITUICAO]->(i:Instituicao)';

                if (instituicoes && instituicoes.length > 0) {
                    query += ' WHERE i.NM_ENTIDADE_ENSINO IN $instituicoes';
                }

                query += ' RETURN DISTINCT o ORDER BY o.NM_ORIENTADOR_PRINCIPAL';

                return await session.run(query, {
                    instituicoes: Array.isArray(instituicoes) ? instituicoes : [instituicoes]
                });
            }
        }

        try {
            if (filtros[filtro]) {
                const result = await filtros[filtro]();

                return res.json(result);
            } else {
                return res.status(400).json({ mensagem: 'Filtro inválido.' });
            }
        } catch (error) {
            console.error(`Erro ao consultar o banco de dados: ${error}`);

            return res.status(500).json({ mensagem: 'Erro no servidor ao processar a consulta.' });
        } finally {
            await session.close();
        }
    }
}

module.exports = filtrosController;