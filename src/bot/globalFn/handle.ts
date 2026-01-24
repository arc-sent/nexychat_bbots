import { formatMessage } from "../handlers/global/calsses";
import { formatMessagee } from "../handlers/global/calsses";
import { redis } from "..";

export async function handleCommand(ctx: any) {
    if ('text' in ctx.message) {
        const message = ctx.message?.text;

        // const checkSubscription = await checkSubscriptionMiddleware(ctx)

        // if (!checkSubscription) {
        //     return;
        // }

        if (ctx.session.sendMessage) {
            const result = await formatMessagee.editMessage(ctx);

            if (!result) {
                console.log('Ошибка в исправлении сообщения!');
            }
        }

        if (message.startsWith('/')) {
            switch (message) {
                case '/start':
                    return ctx.scene.enter('start');
                case '/register':
                    return ctx.scene.enter('register');
                case '/redis':
                    const count = await redis.dbsize();
                    const keys = await redis.keys('*');
                    console.log(keys);

                    await ctx.reply(`Количество ключей в Redis: ${count}`);
                    await ctx.reply(`Ключи в Redis: ${keys}`);
                case '/clear':
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

                default:
                    return ctx.scene.enter('profile');
            }
        }

        switch (message) {
            case '👤 Профиль':
                return ctx.scene.enter('profile');
            case '🔍 Общение':
                return ctx.scene.enter('talkSearch')
            case '🍓 Флирт':
                return ctx.scene.enter('flirtSearch')
            case '💠 Гемы':
                return ctx.scene.enter('gemsScenes')
            default:
                return ctx.scene.enter('profile');
        }
    }
}