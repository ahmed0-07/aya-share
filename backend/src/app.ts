import express from 'express';
import config from './config/env.js';
import morgan from 'morgan';
import AuthRouter from "./modules/Auth/Auth.routes.js"

const app = express();

app.use(morgan('dev'));

app.use("/api/v1/auth", AuthRouter);

app.listen(config.PORT, () => {
    console.log('server in development');
})