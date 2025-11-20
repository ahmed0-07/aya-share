import express from 'express';
import config from './config/env.js';
import morgan from 'morgan';

const app = express();

app.use(morgan('dev'));

app.listen(config.PORT, () => {
    console.log('server in development');
})