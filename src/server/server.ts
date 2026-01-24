import express from 'express';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { UserRouter } from './routers/user.router';
import { FlirtService, SearchService } from './services/search.service';
import { bot } from '../bot/index';
import { PrismaClient } from '@prisma/client';
dotenv.config();

export const redis = new Redis(process.env.URL_REDIS || '');
// export const redis = new Redis('redis://redis:6379');
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();
const search = new SearchService(redis, bot, prisma);
const flirt = new FlirtService(redis, bot, prisma)

const main = async () => {
    const app = express();

    app.use(express.json());
    app.use(bot.webhookCallback('/webhook'))
    app.use('/user', UserRouter);

    app.get('/', (req, res) => {
        res.status(200).json({ message: 'suscess!' })
    })

    app.listen(port, () => {
        console.log(`Server start in ${port}`);
    })

    // search.startBackgroundSearch();

    flirt.startBackgroundSearch();
}

main()