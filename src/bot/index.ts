import { Scenes, Telegraf, session, Context } from "telegraf";
import dotenv from 'dotenv';
import { stage } from "./stage";
import cron from 'node-cron';
import Redis from "ioredis";
import axios from "axios";
import type { CHANNELS } from "./handlers/global/interfaces";

dotenv.config();

export interface MyContextBot extends Context {
    session: Record<string, any>;
}

const token = process.env.TELEG_TOKEN || '';
export const bot = new Telegraf<MyContextBot>(token);

export const redis = new Redis(process.env.URL_REDIS || '');

bot.use(session());
bot.use(stage.middleware() as any);

let REQUIRED_CHANNELS_LET: string[] = [];
const urlCon = process.env.URLCON;

cron.schedule('*/10 * * * *', async () => {
    try {
        const req = await axios.get(`${urlCon}/chanels`);
        if (req.status === 400) throw new Error(req.data.message);

        REQUIRED_CHANNELS_LET = req.data.message.map((item: CHANNELS) => item.nickname);
        console.log("🔄 Обновлён список каналов:", REQUIRED_CHANNELS_LET);
    } catch (err) {
        console.error('❌ Ошибка при обновлении списка каналов:', err);
    }
});

export const checkSubscriptionMiddleware = async (ctx: any) => {
    try {
        const userId = ctx.from.id;
        let notSubscribedChannels: string[] = [];

        for (const channel of REQUIRED_CHANNELS_LET) {
            try {
                const chatMember = await ctx.telegram.getChatMember(channel, userId);
                if (!['member', 'administrator', 'creator'].includes(chatMember.status)) {
                    notSubscribedChannels.push(channel);
                }
            } catch (error) {
                console.error(`⚠️ Ошибка проверки подписки на канал ${channel}:`, error);
            }
        }

        if (notSubscribedChannels.length > 0) {
            const channelLinks = notSubscribedChannels
                .map(channel => `👉 <a href="https://t.me/${channel.replace('@', '')}">${channel}</a>`)
                .join('\n');

            await ctx.reply(
                `❌ <b>Чтобы пользоваться ботом, подпишитесь на каналы:</b>\n\n${channelLinks}`,
                { parse_mode: 'HTML' }
            );
            return;
        }

        return true;
    } catch (error) {
        console.error('❌ Ошибка проверки подписки:', error);
        return false
    }
};

bot.use(async (ctx, next) => {
    const check = await checkSubscriptionMiddleware(ctx);

    if (check) {
        return next()
    } else {
        console.error('Ошибка при проверке подписки');
    }
});

bot.use(async (ctx, next) => {
    const key = `session:${ctx.from?.id}`;

    const sessionRaw = await redis.get(key);
    ctx.session = sessionRaw ? JSON.parse(sessionRaw) : {};

    await next();

    await redis.set(key, JSON.stringify(ctx.session), 'EX', 129600);
});

bot.command('start', async (ctx: any) => {
    return ctx.scene.enter('start');
});

bot.command('register', async (ctx: any) => {
    return ctx.scene.enter('register');
});

bot.command('ss', async (ctx: any) => {
    await ctx.reply('connect');
    await ctx.scene.enter('connect');
});

bot.command('redis', async (ctx: any) => {
    const count = await redis.dbsize();
    const keys = await redis.keys('*');
    console.log(keys);

    await ctx.reply(`Количество ключей в Redis: ${count}`);
    await ctx.reply(`Ключи в Redis: ${keys}`);
});


bot.command('clear', async (ctx: any) => {
    let cursor = '0';
    do {
        const [newCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            'queue:*',
            'COUNT',
            '500'
        );
        cursor = newCursor;
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } while (cursor !== '0');
    await ctx.reply('Все сессии очищены');
});

bot.command('profile', async (ctx: any) => {
    return ctx.scene.enter('profile')
});

bot.hears('👤 Профиль', async (ctx: any) => {
    return ctx.scene.enter('profile')
});

bot.hears('🔍 Общение', async (ctx: any) => {
    return ctx.scene.enter('talkSearch')
})

bot.on('text', async (ctx: any) => {
    return ctx.scene.enter('profile');
});


bot.launch()
    .then(() => {
        console.log('Bot started!')
    })
    .catch((err) => {
        console.log('Bot start with error!', err);
    })