const express = require('express');
const filtrosController = require('../controllers/filtrosController');
const grafosController = require('../controllers/grafosController');

const router = express.Router();

router.get('/filtros/:filtro', filtrosController.index);

router.get('/grafos', grafosController.index);

module.exports = router;