const express = require('express');
const filtrosController = require('../controllers/filtrosController');
const grafosController = require('../controllers/grafosController');

const router = express.Router();

router.get('/filtros/:filtro', filtrosController.index);

router.get('/grafos', grafosController.index);
router.get('/grafos/tabela/paginada', grafosController.tabelaPaginada);
router.get('/grafos/tabela/exportar', grafosController.tabelaExportar);

module.exports = router;