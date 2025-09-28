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
                return await session.run('MATCH (o:Orientador) RETURN o ORDER BY o.NM_ORIENTADOR_PRINCIPAL');
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