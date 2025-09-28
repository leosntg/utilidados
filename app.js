const express = require('express');
const path = require('path');

const routesApi = require('./routes/api');
const routesWeb = require('./routes/web');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routesApi);
app.use('/', routesWeb);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor está rodando em http://localhost:${PORT}`);
});