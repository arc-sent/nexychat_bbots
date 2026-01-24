import axios from 'axios';
import { MyContext } from './../../stage';
import { Scenes } from "telegraf";
import { formatMessagee } from '../global/calsses';
import { redis } from '../..';
import { bot } from './../../index';

export const TalkSearch = new Scenes.WizardScene<MyContext>('talkSearch', async (ctx) => {
    const url = process.env.URL;

    try {
        if (!ctx.from?.id) {
            throw new Error('Ошбика в получении')
        }

        const req = await axios.get(`${url}/user/${ctx.from?.id}`, {
            validateStatus: () => true
        });

        const dataMessage = req.data.message;

        if (req.status === 400) {
            throw new Error(JSON.stringify(dataMessage));
        }

        await ctx.reply(
            `🔍 <b>Поиск запущен!</b>\n\n<i>Ищем ${dataMessage.searchGender ? 'девушек' : 'парней'} для общения...</i>`,
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        [
                            {
                                text: '🚫 Остановить поиск',
                            }
                        ]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                }
            }
        ).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });

        const user = { id: ctx.from.id, gender: dataMessage.gender, search: dataMessage.searchGender, premium: dataMessage.premium };

        const exists = await redis.exists(`queue:talk:${ctx.from.id}`);

        if (exists) {
            await redis.del(`queue:talk:${ctx.from.id}`);
        }

        await redis.del(`session:talk:${ctx.from?.id}`);

        await redis.hset(`queue:talk:${ctx.from.id}`, user)

        return ctx.wizard.next();

    } catch (err) {
        if (err instanceof Error) {
            console.error(`Ошибка при получении данных пользователя анкеты: ${err.message}`)
        } else {
            console.error(`Ошибка при получении данных пользователя анкеты. Ошибка неизвестная: ${err}`)
        }

        await ctx.reply('⚠️ Не удалось загрузить анкету. Попробуйте позже или перезапустите бота.');
        return ctx.scene.leave();
    }
}, async (ctx) => {
    const partnerId = await redis.hget(`session:talk:${ctx.from?.id}`, "id");
    let targetUserId: number | null = Number(partnerId);

    const endChat = await redis.hget(`session:talk:${ctx.from?.id}`, 'end');

    let targetendChat: number = Number(endChat);

    console.log(`targetendChat:${ctx.from?.id}`, targetendChat)

    if (targetendChat == 1) {
        if (!ctx.callbackQuery) {
            return
        }

        if ('data' in ctx.callbackQuery) {
            const data = ctx.callbackQuery.data;

            if (data.startsWith('rate_')) {
                const rate = parseInt(data.split('_')[1]);

                if (isNaN(rate) || rate < 1 || rate > 10) {
                    await ctx.answerCbQuery('Некорректная оценка.');
                    return;
                }

                const userId = ctx.from?.id;
                const url = process.env.URL;

                if (!userId) return;

                try {
                    const req = await axios.put(`${url}/user/rating/${ctx.from.id}`,
                        {
                            value: rate
                        },
                        {
                            validateStatus: () => true
                        }
                    );

                    console.log('req.rating.data', req.data)

                    if (req.status === 400) {
                        throw new Error(JSON.stringify(req.data.message));
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        console.error('err in update rating', err.message)
                    } else {
                        console.error('ivalid err in update rating', err)
                    }
                }

                const messageId = await redis.hget(`session:talk:${ctx.from.id}`, 'ratingId');

                console.log(`session:talk:${ctx.from.id} messageId`, Number(messageId));

                const deleteKeyboard = await formatMessagee.deleteMessageById(ctx, Number(messageId));

                if (!deleteKeyboard) {
                    console.error('Ошибка в исправлении сообщения');
                }

                try {
                    const reqGems = await axios.put(`${process.env.URLCON}/users/${ctx.from.id}/gems`, {
                        count: 300,
                        action: "increment"
                    }, {
                        validateStatus: (status) => status < 500
                    });

                    console.log('reqGems.data', reqGems.data)

                    if (reqGems.status === 400) {
                        throw new Error('❌ Ошибка платежа! Проверьте баланс и попробуйте снова.');
                    }

                    await ctx.reply('🎁 Вы получили <b>200 гемов</b> 💠 за оценку пользователя и участие в чате с ним!', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [{ text: '👤 Профиль' }],
                                [{ text: '🔍 Продолжить поиск' }]
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: false
                        }
                    });
                } catch (err) {
                    if (err instanceof Error) {
                        console.error('err in gift gems', err.message);
                    } else {
                        console.error('invalid err in gift gems', err);
                    }

                    await ctx.reply('❌ Произошла ошибка при начислении гемов. Попробуйте позже.');
                }


                await redis.del(`session:talk:${ctx.from?.id}`);

                return
            }
        }

    }

    if (!ctx.message) {
        await ctx.reply('⚠️ <b>Произошла ошибка</b>\n\nПожалуйста, отправьте сообщение еще раз.', {
            parse_mode: 'HTML'
        });
        return;
    }

    if (!partnerId) {
        if (!ctx.message) {
            await ctx.reply('⚠️ <b>Произошла ошибка</b>\n\nПожалуйста, отправьте сообщение еще раз.', {
                parse_mode: 'HTML'
            });
            return;
        }

        if ('text' in ctx.message) {
            const message = ctx.message.text;

            if (!ctx.chat) {
                return
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

                        console.log('Все сессии очищены');
                    default:
                        await ctx.reply('❌ Неизвестная команда. Попробуйте /help для получения списка доступных команд.');
                        break;
                }
                return;
            }

            switch (message) {
                case '👤 Профиль':
                    return ctx.scene.enter('profile');
                case '🔍 Продолжить поиск':
                    return ctx.scene.enter('talkSearch');
                default:
                    await redis.del(`queue:talk:${ctx.from?.id}`);
                    return ctx.scene.enter('profile')
            }
        }
    } else {
        if (ctx.session.sendMessage) {
            const deleteMessage = await formatMessagee.deleteMessage(ctx);

            if (!deleteMessage) {
                console.error('Ошибка в удалении сообщения')
            }
        }

        if ('text' in ctx.message) {
            const message = ctx.message.text;

            if (!ctx.chat) {
                return
            }

            if (message.startsWith('/')) {
                switch (message) {
                    case '/start':
                        return ctx.scene.enter('start');
                    case '/register':
                        return ctx.scene.enter('register');
                    default:
                        await ctx.reply('❌ Неизвестная команда. Попробуйте /help для получения списка доступных команд.');
                        break;
                }
                return;
            }

            switch (message) {
                case '⛔ Завершить чат':
                    const start = await redis.hget(`session:talk:${ctx.from?.id}`, 'start');

                    console.log('start', start);

                    const durationMs = Date.now() - Number(start);
                    const durationMin = Math.floor(durationMs / 60000);

                    if (durationMin >= 1) {
                        await ctx.reply('⛔ <b>Вы завершили чат</b>', {
                            parse_mode: 'HTML',
                            reply_markup: {
                                remove_keyboard: true
                            }
                        });


                        await ctx.reply(
                            '💬 <b>Оцените собеседника</b>\n\nПоставьте оценку от 1 до 10 — это повлияет на рейтинг пользователя и поможет другим находить лучших собеседников ✨',
                            {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: '1', callback_data: 'rate_1' },
                                            { text: '2️', callback_data: 'rate_2' },
                                            { text: '3️', callback_data: 'rate_3' },
                                        ],
                                        [
                                            { text: '4️', callback_data: 'rate_4' },
                                            { text: '5️', callback_data: 'rate_5' },
                                            { text: '6️', callback_data: 'rate_6' },
                                        ],
                                        [
                                            { text: '7️', callback_data: 'rate_7' },
                                            { text: '8️', callback_data: 'rate_8' },
                                            { text: '9', callback_data: 'rate_9' },
                                        ],
                                        [
                                            { text: '10', callback_data: 'rate_10' },
                                        ]
                                    ],
                                    resize_keyboard: true,
                                    one_time_keyboard: false
                                }
                            }
                        ).then((sendMessage) => {
                            ctx.session.sendMessageTalk = sendMessage.message_id;
                        });;


                        await bot.telegram.sendMessage(
                            targetUserId,
                            '⛔ <b>Собеседник завершил чат</b>',
                            {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    remove_keyboard: true
                                }
                            }
                        );

                        const sendID = await bot.telegram.sendMessage(
                            targetUserId,
                            '💬 Поставьте оценку от 1 до 10 — она повлияет на его рейтинг и поможет другим находить лучших собеседников ✨',
                            {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [
                                        [
                                            { text: '1', callback_data: 'rate_1' },
                                            { text: '2️', callback_data: 'rate_2' },
                                            { text: '3️', callback_data: 'rate_3' },
                                        ],
                                        [
                                            { text: '4️', callback_data: 'rate_4' },
                                            { text: '5️', callback_data: 'rate_5' },
                                            { text: '6️', callback_data: 'rate_6' },
                                        ],
                                        [
                                            { text: '7️', callback_data: 'rate_7' },
                                            { text: '8️', callback_data: 'rate_8' },
                                            { text: '9', callback_data: 'rate_9' },
                                        ],
                                        [
                                            { text: '10', callback_data: 'rate_10' },
                                        ]
                                    ],
                                    resize_keyboard: true,
                                    one_time_keyboard: false
                                }
                            }
                        );

                        const messageId = sendID.message_id;

                        console.log('messageId', messageId);

                        await redis.hset(`session:talk:${ctx.from?.id}`, 'end', '1');
                        await redis.hset(`session:talk:${ctx.from?.id}`, 'ratingId', ctx.session.sendMessageTalk);

                        await redis.hset(`session:talk:${partnerId}`, 'end', '1');
                        await redis.hset(`session:talk:${partnerId}`, 'ratingId', messageId);

                        const endCtxId = await redis.hget(`session:talk:${ctx.from?.id}`, 'end');

                        console.log(`session:talk:${ctx.from?.id}`, endCtxId);

                        return
                    }


                    await redis.del(`session:talk:${ctx.from?.id}`);
                    await redis.del(`session:talk:${partnerId}`);

                    await ctx.reply('⛔ Вы завершили чат.\n\n👉 Нажмите кнопку ниже для поиска нового собеседника или перейдите в свой профиль.', {
                        parse_mode: 'HTML',
                        reply_markup: {
                            keyboard: [
                                [{ text: '👤 Профиль' }],
                                [{ text: '🔍 Продолжить поиск' }]
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: false
                        }
                    })

                    await bot.telegram.sendMessage(
                        targetUserId,
                        '⛔ Ваш собеседник завершил чат.\n\n👉 Нажмите кнопку ниже для поиска нового собеседника или перейдите в свой профиль.',
                        {
                            parse_mode: 'HTML',
                            reply_markup: {
                                keyboard: [
                                    [{ text: '👤 Профиль' }],
                                    [{ text: '🔍 Продолжить поиск' }]
                                ],
                                resize_keyboard: true,
                                one_time_keyboard: false
                            }
                        }
                    );

                    return
                default:
                    if ('text' in ctx.message) {
                        await bot.telegram.sendMessage(targetUserId, ctx.message.text);
                    }

            }
        }

        else if ('photo' in ctx.message) {
            await bot.telegram.sendPhoto(targetUserId, ctx.message.photo[ctx.message.photo.length - 1].file_id);
        }

        else if ('voice' in ctx.message) {
            await bot.telegram.sendVoice(targetUserId, ctx.message.voice.file_id);
        }

        else if ('sticker' in ctx.message) {
            await bot.telegram.sendSticker(targetUserId, ctx.message.sticker.file_id);
        }

        else if ('audio' in ctx.message) {
            await bot.telegram.sendAudio(targetUserId, ctx.message.audio.file_id);
        }

        else if ('video_note' in ctx.message) {
            await bot.telegram.sendVideoNote(targetUserId, ctx.message.video_note.file_id);
        }

        else if ('video' in ctx.message) {
            await bot.telegram.sendVideo(
                targetUserId,
                ctx.message.video.file_id,
                {
                    caption: ctx.message.caption ?? undefined,
                    parse_mode: 'HTML'
                }
            );

        }
    }
})