import dotenv from 'dotenv';
dotenv.config();

export default {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    MODE: process.env.MODE,
    DATABASE_DEV: process.env.DATABASE_DEV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
    JWT_REFRESH_KEY: process.env.JWT_REFRESH_KEY
};