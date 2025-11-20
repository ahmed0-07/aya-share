import dotenv from 'dotenv';
dotenv.config();

export default {
    DATABASE_URL: process.env.DATABASE_URL,
    PORT: process.env.PORT,
    MODE: process.env.MODE,
    DATABASE_DEV:process.env.DATABASE_DEV
};