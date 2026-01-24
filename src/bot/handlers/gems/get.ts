import axios from 'axios';
import { MyContext } from '../../stage';
import { Scenes } from "telegraf";
import { formatNumber } from '../global/function';
import { handleCommand } from '../../globalFn/handle';
import { formatMessagee } from '../global/calsses';

export const gemsScenes = new Scenes.WizardScene<MyContext>('gemsScenes', async (ctx) => {
    const text = `
💠 <b>Меню перевода гемов</b> 💠

Здесь вы можете <b>отправлять свои гемы другим пользователям</b>.  
Для этого просто введите <b>ID получателя</b>.

<b>Получение гемов:</b>

💘 <b>Без премиума:</b>
— До <b>3 чатов в сутки</b>, каждый длится не менее 2 минут.  
— Если вам поставят <b>рейтинг от 5 до 10</b>, получите от <b>50 до 150 гемов</b>.

⭐ <b>С премиумом:</b>
— Получайте гемы за <b>каждый чат продолжительностью от 2 минут</b>.  
— При получении <b>рейтинга от 5 до 10</b>, получите от <b>150 до 300 гемов</b>.

💠 <b>Премиум открывает неограниченные возможности и увеличенные награды!</b>
`;


    await ctx.reply(text, {
        parse_mode: 'HTML'
    });

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                const message = ctx.message?.text;

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
                    case '👤 Профиль':
                        return ctx.scene.enter('profile');
                    case '🔍 Общение':
                        await ctx.reply('🔍 Поиск')
                        return ctx.scene.leave();
                    case '💠 Гемы':
                        return ctx.scene.enter('gemsScenes')
                    default:

                        if (!/^\d+$/.test(message.trim())) {
                            await ctx.reply('⚠️ <b>Некорректный ID</b>\n\nID должен содержать только цифры.\nПожалуйста, введите ID ещё раз.', { parse_mode: 'HTML' });
                            return;
                        }

                        try {
                            const urlCon = process.env.URLCON

                            const checkUserCon = await axios.get(`${urlCon}/users/${message}`, {
                                validateStatus: () => true
                            });

                            if (checkUserCon.status === 400) {
                                throw new Error(JSON.stringify(checkUserCon.data.message));
                            }

                            const url = process.env.URL;

                            const checkUserChat = await axios.get(`${url}/user/${message}`, {
                                validateStatus: () => true
                            });

                            if (checkUserChat.status === 400) {
                                throw new Error(JSON.stringify(checkUserChat.data.message))
                            }

                            const formatGems = formatNumber(checkUserCon.data.message.coin)

                            const userData = checkUserChat.data.message;

                            console.log('userData', userData);

                            const reqSendGems = await axios.get(`${urlCon}/users/${ctx.from?.id}`, {
                                validateStatus: () => true
                            });

                            if (reqSendGems.status === 400) {
                                await ctx.reply(`
⚠️ <b>Ошибка при получении вашего счёта</b>

Пожалуйста, попробуйте позже. Возможно, временные неполадки.
`, {
                                    parse_mode: 'HTML'
                                });

                                return ctx.scene.leave();
                            }

                            const coins = reqSendGems.data.message.coin;

                            console.log('coins', coins);

                            if (coins < 100) {
                                await ctx.reply('🚫 Недостаточно гемов для перевода! Вы можете перевести минимум 100 гемов.');
                                return ctx.scene.enter('profile')
                            }

                            const options = [100, 500, 1000, 5000];
                            const available = options.filter(option => option <= coins);

                            const keyboard: { text: string, callback_data: string }[][] = [];

                            for (let i = 0; i < available.length; i += 2) {
                                const row = [
                                    {
                                        text: `${available[i]} 💠`,
                                        callback_data: `send_${available[i]}`
                                    }
                                ];

                                if (available[i + 1]) {
                                    row.push({
                                        text: `${available[i + 1]} 💠`,
                                        callback_data: `send_${available[i + 1]}`
                                    });
                                }

                                keyboard.push(row);
                            }

                            ctx.session.sendGemsId = message;

                            const profileMessage = `
<b>${userData.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
<b>⭐️ Рейтинг: 10.0</b> 
———————————————
<b>${userData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${userData.name}  
<b>🎂 Возраст:</b> ${userData.age}
———————————————
<b>💠 Гемы:</b> ${formatGems}
———————————————
Сколько гемов вы хотите отправить?        
`
                            await ctx.reply(profileMessage, {
                                parse_mode: 'HTML',
                                reply_markup: {
                                    inline_keyboard: [
                                        ...keyboard,
                                        [
                                            {
                                                text: 'Ввести своё количество',
                                                callback_data: 'send_custom_amount'
                                            }
                                        ]
                                    ]
                                }
                            }).then((sendMessage) => {
                                ctx.session.sendMessage = sendMessage.message_id;
                            });


                            return ctx.wizard.next();
                        } catch (err) {
                            if (err instanceof Error) {
                                console.error(err.message);
                            } else {
                                console.error(err);
                            }
                            const textReply = `
⚠️ <b>Ошибка при получении пользователя</b>

Пожалуйста, убедитесь, что ID указан корректно и состоит только из цифр.
Попробуйте ввести ID ещё раз.
`;

                            await ctx.reply(textReply.trim(), {
                                parse_mode: 'HTML'
                            });

                        }


                        return;
                }
            }
        }
        return
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    if ('data' in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        if (message === 'send_custom_amount') {
            return ctx.scene.enter('sendGemsCustom');
        } else if (message.startsWith('send_')) {
            const parts = message.split('_');
            const value = Number(parts[1]);
            const url = process.env.URLCON;
            try {
                const reqCoin = await axios.put(`${url}/match/coin/${ctx.from?.id}/${ctx.session.sendGemsId}`,
                    {
                        count: value
                    },
                    {
                        validateStatus: () => true
                    }
                );

                if (reqCoin.status === 401) {
                    await ctx.reply(JSON.stringify(reqCoin.data.message));
                }

                if (reqCoin.status === 400) {
                    throw new Error(JSON.stringify(reqCoin.data.message));
                }

                const result = await formatMessagee.deleteMessage(ctx);

                if (!result) {
                    await ctx.reply('⚠️ Произошла ошибка! Попробуйте еще раз');
                }

                try {
                    const reqMessage = await axios.post(`https://api.telegram.org/bot${process.env.TELEG_TOKEN}/sendMessage`, {
                        chat_id: ctx.session.sendGemsId,
                        text: `<b>🎁 Перевод гемов</b>\n\nПользователь с ID <code>${ctx.from?.id}</code> отправил вам <b>${value} 💠</b>!`,
                        parse_mode: "HTML"
                    }, {
                        validateStatus: () => true
                    });


                    if (reqMessage.status === 400) {
                        throw new Error(JSON.stringify(reqMessage.data));
                    }
                } catch (err) {
                    if (err instanceof Error) {
                        console.error('Ошибка при отправке гемов' + err.message)
                    } else {
                        console.error('Неизвестная ошибка при отправке гемов' + err)
                    }
                }


                return ctx.scene.enter('profile')
            } catch (err) {
                if (err instanceof Error) {
                    console.error('Ошибка при отправке гемов' + err.message)
                } else {
                    console.error('Неизвестная ошибка при отправке гемов' + err)
                }

                await ctx.reply('⚠️ Произошла ошибка! Попробуйте еще раз')
            }

        }
    }
});

export const sendGemsCustom = new Scenes.WizardScene<MyContext>('sendGemsCustom', async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    const editMessage = await formatMessagee.editMessageOnlyText(ctx, 'Введите количество гемов, которое вы хотите отправить пользователю.\n\nЕсли хотите отправить весь баланс — нажмите кнопку ниже', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Отправить все гемы',
                        callback_data: 'send_all'
                    }
                ],
                [
                    {
                        text: 'Назад',
                        callback_data: 'exit'
                    }
                ]
            ]
        }
    });

    if (!editMessage) {
        await ctx.reply('⚠️ Произошла ошибка! Перезапусти поиск и попробуй еще раз.');
        return
    }

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                if (!/^\d+$/.test(ctx.message.text)) {
                    await ctx.reply(
                        '❌ <b>Неверное значение</b>\n\nВведите <u>только число</u> — без букв, пробелов и символов.\nНапример: <code>500</code>',
                        { parse_mode: 'HTML' }
                    );
                    return;
                }


                const value = Number(ctx.message.text);

                if (value < 100) {
                    await ctx.reply(
                        '🚫 <b>Минимальное количество для перевода</b> составляет <b>100 гемов</b>.\n\n' +
                        'Введите <b>число больше 100</b>, чтобы продолжить.',
                        { parse_mode: 'HTML' }
                    );

                    return
                }


                try {
                    const url = process.env.URL;

                    const reqCoin = await axios.put(`${url}/match/coin/${ctx.from?.id}/${ctx.session.sendGemsId}`,
                        {
                            count: value
                        },
                        {
                            validateStatus: () => true
                        }
                    );

                    if (reqCoin.status === 401) {
                        console.log(reqCoin.data.message)
                        await ctx.reply(
                            '🚫 <b>Недостаточно гемов!</b>\n\n' +
                            'Попробуйте перевести меньшее количество.',
                            { parse_mode: 'HTML' }
                        );

                        return ctx.scene.enter('profileScene')
                    }

                    if (reqCoin.status === 400) {
                        throw new Error(JSON.stringify(reqCoin.data.message));
                    }

                    const result = await formatMessagee.deleteMessage(ctx);

                    if (!result) {
                        await ctx.reply('⚠️ Произошла ошибка! Попробуйте еще раз');
                    }

                    try {
                        const reqMessage = await axios.post(`https://api.telegram.org/bot${process.env.TELEG_TOKEN}/sendMessage`, {
                            chat_id: ctx.session.sendGemsId,
                            text: `<b>🎁 Перевод гемов</b>\n\nПользователь с ID <code>${ctx.from?.id}</code> отправил вам <b>${value} 💠</b>!`,
                            parse_mode: "HTML"
                        }, {
                            validateStatus: () => true
                        });


                        if (reqMessage.status === 400) {
                            throw new Error(JSON.stringify(reqMessage.data));
                        }
                    } catch (err) {
                        if (err instanceof Error) {
                            console.error('Ошибка при отправке гемов' + err.message)
                        } else {
                            console.error('Неизвестная ошибка при отправке гемов' + err)
                        }
                    }

                    return ctx.scene.enter('profile')
                } catch (err) {
                    if (err instanceof Error) {
                        console.error('Ошибка при отправке гемов' + err.message)
                    } else {
                        console.error('Неизвестная ошибка при отправке гемов' + err)
                    }

                    await ctx.reply('⚠️ Произошла ошибка! Попробуйте еще раз');
                    return
                }
            }
        }
        return
    }

    if ('data' in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        if (message === 'send_all') {
            const editMessage = await formatMessagee.editMessageOnlyText(ctx, '<b>Вы уверены, что хотите отправить все свои гемы?</b>', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Отправить все',
                                callback_data: 'yes'
                            }
                        ],
                        [
                            {
                                text: 'Вернуться назад',
                                callback_data: 'no'
                            }
                        ]
                    ]
                }
            });

            if (!editMessage) {
                await ctx.reply('⚠️ Произошла ошибка! попробуйте еще раз.');
                return
            }

            return ctx.wizard.next();
        } else if (message === 'exit') {
            ctx.session.exitGems = true
            return ctx.scene.enter('sendGems')
        }
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    if ('data' in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        if (message === 'no') {
            return ctx.scene.enter('sendGemsCustom')
        } else if (message === 'yes') {
            const url = process.env.URLCON;

            const req = await axios.get(`${url}/users/${ctx.from?.id}`, {
                validateStatus: () => true
            });

            if (req.status === 400) {
                await ctx.reply('⚠️ Произошла ошибка! Перезапустите отправку гемов и попробуйте еще раз.');
                return
            }

            const value = req.data.message.coin

            const result2 = await sendGemsFuction(value, ctx);

            if (!result2.status) {
                console.error(result2?.message);
                return
            }

            return ctx.scene.enter('profile')
        } else {
            await ctx.reply('⚠️ Произошла ошибка! Вы нажали что-то не то.')
        }
    }
});


const sendGemsFuction = async (value: number, ctx: any) => {
    try {
        const url = process.env.URLCON;

        const reqCoin = await axios.put(`${url}/match/coin/${ctx.from?.id}/${ctx.session.sendGemsId}`,
            {
                count: value
            },
            {
                validateStatus: () => true
            }
        );

        if (reqCoin.status === 400) {
            throw new Error(JSON.stringify(reqCoin.data.message));
        }

        const result = await formatMessagee.deleteMessage(ctx);

        if (!result) {
            await ctx.reply('⚠️ Произошла ошибка! Попробуйте еще раз');
        }

        try {
            const reqMessage = await axios.post(`https://api.telegram.org/bot${process.env.TELEG_TOKEN}/sendMessage`, {
                chat_id: ctx.session.sendGemsId,
                text: `<b>🎁 Перевод гемов</b>\n\nПользователь с ID <code>${ctx.from?.id}</code> отправил вам <b>${value} 💠</b>!`,
                parse_mode: "HTML"
            }, {
                validateStatus: () => true
            });


            if (reqMessage.status === 400) {
                throw new Error(JSON.stringify(reqMessage.data));
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error('Ошибка при отправке гемов' + err.message)
            } else {
                console.error('Неизвестная ошибка при отправке гемов' + err)
            }
        }

        return { status: true }
    } catch (err) {
        let errMessage;

        if (err instanceof Error) {
            errMessage = err.message
        } else {
            console.error(err);
            errMessage = 'Неизвестная ошибка '
        }

        return { message: errMessage, status: false }
    }
}