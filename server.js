require('dotenv').config()
const express = require('express');
const PORT = process.env.PORT || 3000;
const helmet = require("helmet");

const sessionConfig = require('./helpers/sessionConfig');
const apiRouter = require('./routes/apiRouter')
const mainRouter = require('./routes');
const errorHandler = require('./middleWares/errorHandler');
require('./helpers/initDirs')();

const app = express();
app.use(helmet());
app.set('view engine', 'ejs');
app.use(express.static('public'));      // if nginx proxy then comment this line
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(sessionConfig)

app.use('/api', apiRouter)
app.use(mainRouter)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Sever started at http://localhost:${PORT}`);
})
