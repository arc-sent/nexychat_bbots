import Redis from "ioredis";
import { Telegraf } from "telegraf";
import { MyContextBot } from "../../bot";
import { PrismaClient } from "@prisma/client";
import { formatNumber } from "../../bot/handlers/global/function";
import axios from "axios";

export class SearchService {
    private redis: Redis;
    private bot: any;
    private prisma: PrismaClient;
    private urlcon;
    private loggerEnabled;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(redis: Redis, bot: any, prisma: PrismaClient) {
        this.redis = redis;
        this.bot = bot;
        this.prisma = prisma;
        this.urlcon = process.env.URLCON;
        this.loggerEnabled = process.env.LOGGER;
    }

    private log(...args: any[]) {
        if (this.loggerEnabled) {
            console.log('[SEARCH]', ...args);
        }
    }

    startBackgroundSearch() {
        if (this.intervalId) return;

        this.log('🔍 Фоновый поиск общения запущен (интервал 10 секунд)');

        this.intervalId = setInterval(async () => {

            try {
                const keys: string[] = [];
                let cursor = '0';
                do {
                    const result = await this.redis.scan(cursor, 'MATCH', 'queue:talk:*', 'COUNT', 500);
                    cursor = result[0];
                    keys.push(...result[1]);

                    this.log('📦 SCAN batch:', cursor);

                } while (cursor !== '0');

                if (keys.length === 0) {
                    this.log('ℹ Очередь пуста, пользователей нет');
                    return;
                }

                const pipeline = this.redis.pipeline();
                keys.forEach(key => pipeline.hgetall(key));
                const results2: any = await pipeline.exec();

                const values = results2
                    .map(res => res[1])
                    .sort((a, b) => {
                        if (a.premium === 'true' && b.premium !== 'true') return -1;
                        if (a.premium !== 'true' && b.premium === 'true') return 1;
                        return 0;
                    });

                this.log('📊 Отсортированные пользователи:', values.map(v => ({
                    id: v.id,
                    premium: v.premium
                })));

                for (const user of values) {
                    this.log(`🔎 Подбор пары для user=${user.id}`);

                    const partner = values.find(u =>
                        u.id !== user.id &&
                        ((u.search !== user.search && u.gender !== user.gender) ||
                            (u.search === user.search && u.gender === user.gender))
                    );

                    if (!partner) continue;

                    const activeUserSession = await this.redis.exists(`session:talk:${user.id}`);
                    const activePartnerSession = await this.redis.exists(`session:talk:${partner.id}`);

                    if (activeUserSession || activePartnerSession) continue;

                    const partnerData = await this.prisma.user.findFirst({
                        where: { id: partner.id },
                        include: { storyChats: true }
                    });

                    const userData = await this.prisma.user.findFirst({
                        where: { id: user.id },
                        include: { storyChats: true }
                    });

                    if (!partnerData || !userData) {
                        console.error(`❌ Пользователи не найдены в БД: User ${user.id}, Partner ${partner.id}`);
                        continue;
                    }

                    const partnerHistory = partnerData.storyChats ?? [];
                    const userHistory = userData.storyChats ?? [];

                    if (partnerHistory.find(s => s.storyId === user.id)) continue;
                    if (userHistory.find(s => s.storyId === partner.id)) continue;

                    const conDataPartner = await axios.get(`${this.urlcon}/users/${partner.id}`, { validateStatus: () => true });
                    const conDataUser = await axios.get(`${this.urlcon}/users/${user.id}`, { validateStatus: () => true });

                    const formatGemsPartner = conDataPartner.status === 400 ? '0' : formatNumber(conDataPartner.data.message.coin);
                    const formatGemsUser = conDataUser.status === 400 ? '0' : formatNumber(conDataUser.data.message.coin);

                    const partnerMessage = `
<b>${partnerData.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
${partnerData.ratingViewed ? '' : `<b>⭐️ Рейтинг: ${partnerData.rating}</b>\n`}
———————————————
<b>${partnerData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${partnerData.name}
<b>🎂 Возраст:</b> ${partnerData.age}
${partnerData.coinViewed ? '' : `———————————————\n<b>💠 Гемы:</b> ${formatGemsPartner}`}
`;

                    const userMessage = `
<b>${userData.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
${userData.ratingViewed ? '' : `<b>⭐️ Рейтинг: ${userData.rating}</b>\n`}
———————————————
<b>${userData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${userData.name}
<b>🎂 Возраст:</b> ${userData.age}
${userData.coinViewed ? '' : `———————————————\n<b>💠 Гемы:</b> ${formatGemsUser}`}
`;

                    await this.redis.del(`queue:talk:${user.id}`);
                    await this.redis.del(`session:talk:${user.id}`);
                    await this.redis.hset(`session:talk:${user.id}`, { id: partner.id, reward: false, start: Date.now().toString(), end: 0 });

                    await this.redis.del(`queue:talk:${partner.id}`);
                    await this.redis.del(`session:talk:${partner.id}`);
                    await this.redis.hset(`session:talk:${partner.id}`, { id: user.id, reward: false, start: Date.now().toString(), end: 0 });

                    this.bot.telegram.sendMessage(user.id, partnerMessage, {
                        parse_mode: 'HTML',
                        reply_markup: { keyboard: [[{ text: '⛔ Завершить чат' }]], resize_keyboard: true, one_time_keyboard: false }
                    });


                    this.bot.telegram.sendMessage(partner.id, userMessage, {
                        parse_mode: 'HTML',
                        reply_markup: { keyboard: [[{ text: '⛔ Завершить чат' }]], resize_keyboard: true, one_time_keyboard: false }
                    });


                    console.log(`💬 [CHAT] ЧАТ СОЗДАН: ${user.id} ↔ ${partner.id}`);

                    await this.prisma.story.createMany({
                        data: [
                            { userId: user.id, storyId: partner.id },
                            { userId: partner.id, storyId: user.id }
                        ]
                    });

                    break;
                }
            } catch (error) {
                console.error('❌ Ошибка в фоне поиска:', error);
            }
        }, 10000);
    }

    stopBackgroundSearch() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⛔ Фоновый поиск остановлен.');
        }
    }
}

export class FlirtService {
    private redis: Redis;
    private bot: any;
    private prisma: PrismaClient;
    private urlcon;
    private loggerEnabled;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(redis: Redis, bot: any, prisma: PrismaClient) {
        this.redis = redis;
        this.bot = bot;
        this.prisma = prisma;
        this.urlcon = process.env.URLCON;
        this.loggerEnabled = process.env.LOGGER;
    }

    private log(...args: any[]) {
        if (this.loggerEnabled) {
            console.log('[FLIRT]', ...args);
        }
    }

    startBackgroundSearch() {
        if (this.intervalId) return;

        this.log('🍓 Фоновый поиск флирт запущен каждые 10 секунд...');

        this.intervalId = setInterval(async () => {
            try {
                const keys: string[] = [];
                let cursor = '0';

                do {
                    const [nextCursor, batch] = await this.redis.scan(
                        cursor,
                        'MATCH',
                        'queue:flirt:*',
                        'COUNT',
                        500
                    );
                    cursor = nextCursor;
                    keys.push(...batch);

                    this.log('📦 SCAN batch in flirt:', {
                        cursor,
                        found: batch.length
                    });

                } while (cursor !== '0');

                if (keys.length === 0) {
                    this.log('ℹ Очередь пуста, пользователей нет в флирте');
                    return;
                }

                if (keys.length < 2) {
                    return;
                }

                const pipeline = this.redis.pipeline();
                keys.forEach(key => pipeline.hgetall(key));
                const results: any = await pipeline.exec();

                const values = results
                    .map(r => r[1])
                    .filter(u => u?.id)
                    .sort((a, b) => {
                        if (a.premium === 'true' && b.premium !== 'true') return -1;
                        if (a.premium !== 'true' && b.premium === 'true') return 1;
                        return 0;
                    });

                this.log('📊 Отсортированные пользователи:', values.map(v => ({
                    id: v.id,
                    premium: v.premium
                })));
                
                for (const user of values) {
                    const partner = values.find(u =>
                        u.id !== user.id &&
                        (
                            (u.search !== user.search && u.gender !== user.gender) ||
                            (u.search === user.search && u.gender === user.gender)
                        )
                    );

                    if (!partner) {
                        continue;
                    }

                    const activeUserSession = await this.redis.exists(`session:flirt:${user.id}`);
                    const activePartnerSession = await this.redis.exists(`session:flirt:${partner.id}`);

                    if (activeUserSession || activePartnerSession) {
                        continue;
                    }

                    const [userData, partnerData] = await Promise.all([
                        this.prisma.user.findFirst({
                            where: { id: user.id },
                            include: { storyChats: true }
                        }),
                        this.prisma.user.findFirst({
                            where: { id: partner.id },
                            include: { storyChats: true }
                        })
                    ]);

                    if (!userData || !partnerData) {
                        continue;
                    }

                    if (userData.storyChats?.some(s => s.storyId === partner.id)) {
                        continue;
                    }

                    if (partnerData.storyChats?.some(s => s.storyId === user.id)) {
                        continue;
                    }

                    const [conUser, conPartner] = await Promise.all([
                        axios.get(`${this.urlcon}/users/${user.id}`, { validateStatus: () => true }),
                        axios.get(`${this.urlcon}/users/${partner.id}`, { validateStatus: () => true })
                    ]);

                    const gemsUser =
                        conUser.status === 400 ? '0' : formatNumber(conUser.data.message.coin);
                    const gemsPartner =
                        conPartner.status === 400 ? '0' : formatNumber(conPartner.data.message.coin);

                    const userMessage = `
<b>${userData.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
———————————————
<b>${userData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${userData.name}
<b>🎂 Возраст:</b> ${userData.age}
<b>💠 Гемы:</b> ${gemsUser}
`;

                    const partnerMessage = `
<b>${partnerData.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
———————————————
<b>${partnerData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${partnerData.name}
<b>🎂 Возраст:</b> ${partnerData.age}
<b>💠 Гемы:</b> ${gemsPartner}
`;

                    await this.redis.del(
                        `queue:flirt:${user.id}`,
                        `queue:flirt:${partner.id}`,
                        `session:flirt:${user.id}`,
                        `session:flirt:${partner.id}`
                    );

                    await this.redis.hset(`session:flirt:${user.id}`, {
                        id: partner.id,
                        reward: false,
                        start: Date.now().toString(),
                        end: 0
                    });

                    await this.redis.hset(`session:flirt:${partner.id}`, {
                        id: user.id,
                        reward: false,
                        start: Date.now().toString(),
                        end: 0
                    });

                    await Promise.all([
                        this.bot.telegram.sendMessage(user.id, partnerMessage, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                keyboard: [[{ text: '⛔ Завершить чат' }]],
                                resize_keyboard: true
                            }
                        }),
                        this.bot.telegram.sendMessage(partner.id, userMessage, {
                            parse_mode: 'HTML',
                            reply_markup: {
                                keyboard: [[{ text: '⛔ Завершить чат' }]],
                                resize_keyboard: true
                            }
                        })
                    ]);

                    console.log(`🍓 [FLIRT] ЧАТ СОЗДАН: ${user.id} ↔ ${partner.id}`);

                    await this.prisma.story.createMany({
                        data: [
                            { userId: user.id, storyId: partner.id },
                            { userId: partner.id, storyId: user.id }
                        ]
                    });

                    break;
                }

            } catch (error) {
                console.error('❌ [FLIRT] Ошибка в фоне поиска:', error);
            }
        }, 10000);
    }

    stopBackgroundSearch() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⛔ Фоновый поиск остановлен.');
        }
    }
}
