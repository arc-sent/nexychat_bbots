import { UserPUT } from './interface';
import { MyContext } from '../../stage';
import { Scenes } from "telegraf";
import { User } from "../global/calsses";
import { ErrorFn, formatNumber } from "../global/function";
import axios from "axios";
import { handleCommand } from '../../globalFn/handle';
import { formatMessagee } from '../global/calsses';
import { buttonSaveAgain } from '../global/keyboard';
import { EditStatistick } from './interface';

const UserClass = new User();
const urlCon = process.env.URLCON;

export const Profile = new Scenes.WizardScene<MyContext>('profile', async (ctx) => {
    try {
        if (!ctx.from) {
            await ctx.reply('⚠️ Возникла ошибка при получении ваших данных. Пожалуйста, перезапустите бота и попробуйте снова.');
            return ctx.scene.leave();
        }

        const req = await UserClass.getUser(ctx.from.id);

        const reqMessage = req.message

        if (!req.status && typeof reqMessage === 'string') {
            throw new Error(reqMessage)
        }

        if (typeof reqMessage !== 'string') {

            const req = await axios.get(`${urlCon}/users/${ctx.from?.id}`, {
                validateStatus: () => true
            });

            let formatGems = '0';

            if (req.status === 400) {
                console.log(req.data)
                await ctx.reply('⚠️ Произошла ошибка на сервере.\n\nНе удалось загрузить гемы. Пожалуйста, попробуйте позже.');
            } else {
                const userData = req.data.message;
                console.log('userData', userData.coin);


                formatGems = formatNumber(userData.coin)
            }



            console.log('reqMessage.ratingViewed === true', reqMessage.ratingViewed === true);

            const profileMessage = `
<b>${reqMessage.premium ? '⭐ PREMIUM ⭐' : '💘 Профиль пользователя'}</b>
<b>⭐️ Рейтинг: ${reqMessage.rating}</b> ${reqMessage.premium ? `${reqMessage.ratingViewed === true ? ' (Скрыто)' : ' (Открыто)'}` : ''}
———————————————
<b>${reqMessage.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${reqMessage.name}  
<b>🎂 Возраст:</b> ${reqMessage.age}
<b>${reqMessage.searchGender ? '👱🏻‍♀️' : '👱🏻'} Пол поиска:</b> ${reqMessage.searchGender ? 'Женский' : 'Мужской'}
———————————————
<b>💠 Гемы:</b> ${formatGems} ${reqMessage.premium ? `${reqMessage.coinViewed === true ? ' (Скрыто)' : ' (Открыто)'}` : ''}      
`
            await ctx.reply(`👤 <b>Ваш профиль</b>`, {
                reply_markup: {
                    keyboard: [
                        [{ text: '👤 Профиль' }],
                        [{ text: '🔍 Общение' }, { text: '🍓 Флирт' }],
                        [{ text: '💠 Гемы' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                },
                parse_mode: "HTML",
            }
            ).then((sendMessage) => {
                ctx.session.sendMessageProfile = sendMessage.message_id;
            });

            await ctx.reply(profileMessage, {
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: '⭐ Премиум',
                                callback_data: 'premuim'
                            }
                        ],
                        [
                            {
                                text: '📝 Изменить анкету',
                                callback_data: 'edit'
                            }
                        ]
                    ]
                }
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }

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
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    if ('data' in ctx.callbackQuery) {
        const data = ctx.callbackQuery.data;

        switch (data) {
            case 'edit':
                return ctx.scene.enter('editProfile');
            case 'premuim':
                return ctx.scene.enter('premiumScene');
            default:
                break
        }
    }
});


export const EditProfile = new Scenes.WizardScene<MyContext>('editProfile', async (ctx) => {
    const textReply = `<b>⚙️ Настройки профиля</b>\n\n` +
        `1️⃣ <b>Изменить имя</b>\n` +
        `2️⃣ <b>Изменить возраст</b>\n` +
        `3️⃣ <b>Изменить пол</b>\n` +
        `4️⃣ <b>Изменить пол поиска</b>\n` +
        `5️⃣ <b>Скрыть статистику (Доступно с премиумом)</b>\n` +
        `6️⃣ <b>Заполнить анкету заново</b>\n` +
        `7️⃣ <b>Выйти</b>\n\n` +
        `📌 Выбери действие, нажав на соответствующую кнопку ниже.`

    const replyMarkup = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '1',
                        callback_data: '1'
                    },
                    {
                        text: '2',
                        callback_data: '2'
                    },
                    {
                        text: '3',
                        callback_data: '3'
                    }
                ],
                [
                    {
                        text: '4',
                        callback_data: '4'
                    },
                    {
                        text: '5',
                        callback_data: '5'
                    },
                    {
                        text: '6',
                        callback_data: '6'
                    }
                ],
                [
                    {
                        text: '7',
                        callback_data: '7'
                    }
                ]
            ]
        }

    }

    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        const deleteMessageProfile = await formatMessagee.deleteProfileMessage(ctx);

        if (!deleteMessageProfile) {
            console.error('Ошибка в удалении сообщения')
        }

        switch (message) {
            case '1':
                return ctx.scene.enter('editName');

            case '2':
                return ctx.scene.enter('editAge');

            case '3':
                ctx.scene.enter('editGender');
                break

            case '4':
                await ctx.scene.enter('editGenderSearch');
                break

            case '5':
                await ctx.scene.enter('statistic');
                break

            case '6':
                await ctx.scene.enter('editGender');
                break

            case '7':
                const deleteMessage2 = formatMessagee.deleteMessage(ctx);

                return ctx.scene.enter('profile');

            default:
                break
        }
    }
});

export const editName = new Scenes.WizardScene<MyContext>('editName', async (ctx) => {
    const textReply = 'Введите новое имя';

    const replyMarkup = {};

    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return ctx.wizard.next();
}, async (ctx) => {

    if (!ctx.message) {
        await ctx.reply('⚠️ <b>Произошла ошибка</b>\n\nПожалуйста, отправьте сообщение еще раз.', {
            parse_mode: 'HTML'
        });
        return;
    }


    if ("text" in ctx.message) {
        const message = ctx.message.text;

        ctx.session.update = message

        const profileMessage = `Ваше новое имя: <b>${message}</b>?`

        await ctx.reply(profileMessage, {
            parse_mode: 'HTML',
            ...buttonSaveAgain
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });;

        return ctx.wizard.next();
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        return
    }

    if (!ctx.from?.id) {
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        switch (message) {
            case 'again':
                await ctx.scene.enter('editName');
                break

            case 'save':
                const updateMessage = formatMessagee.deleteMessage(ctx);

                if (!updateMessage) {
                    console.log('Ошибка в удалении сообщения');
                }

                const saveUser = await updateUser(ctx.from?.id, { name: ctx.session.update })

                if (!saveUser) {
                    await ctx.reply('⚠️ Не удалось сохранить. Запустите меню заново через /profile и попробуй еще раз.');
                }

                return ctx.scene.enter('profile');

            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
});

export const editAge = new Scenes.WizardScene<MyContext>('editAge', async (ctx) => {
    const textReply = 'Введите новый возраст от 0 до 99 лет';

    const replyMarkup = {};

    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.message) {
        await ctx.reply('⚠️ <b>Произошла ошибка</b>\n\nПожалуйста, отправьте сообщение еще раз.', {
            parse_mode: 'HTML'
        });
        return;
    }


    if ("text" in ctx.message) {
        const message = ctx.message.text;

        if (!(/^\d{1,2}$/.test(message) && Number(message) >= 0 && Number(message) <= 99)) {
            await ctx.reply('⚠️ Введите свой возраст от 0 до 99 лет');
            return
        }

        ctx.session.update = message

        const profileMessage = `Ваш новый возраст: <b>${message}</b>?`

        await ctx.reply(profileMessage, {
            parse_mode: 'HTML',
            ...buttonSaveAgain
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });;

        return ctx.wizard.next();
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        return
    }

    if (!ctx.from?.id) {
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        switch (message) {
            case 'again':
                await ctx.scene.enter('editAge');
                break

            case 'save':
                const updateMessage = formatMessagee.deleteMessage(ctx);

                if (!updateMessage) {
                    console.log('Ошибка в удалении сообщения');
                }

                const saveUser = await updateUser(ctx.from?.id, { age: Number(ctx.session.update) })

                if (!saveUser) {
                    await ctx.reply('⚠️ Не удалось сохранить. Запустите меню заново через /profile и попробуй еще раз.');
                }

                return ctx.scene.enter('profile');

            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
})

export const editGender = new Scenes.WizardScene<MyContext>('editGender', async (ctx) => {
    const textReply = 'Выберете ваш пол';

    const replyMarkup = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Мужской',
                        callback_data: 'false'
                    }
                ],
                [
                    {
                        text: 'Женский',
                        callback_data: 'true'
                    }
                ]
            ]
        }
    };

    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        console.log('554545454545')
        await ctx.reply('⚠️ Используйте кнопки!')
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        const deleteMessageProfile = await formatMessagee.deleteProfileMessage(ctx);

        if (!deleteMessageProfile) {
            console.error('Ошибка в удалении сообщения')
        }

        console.log('message', message);

        const textReply = `Ваш новый пол: ${message === "false" ? '<b>мужской</b>' : '<b>женский</b>'} ?`

        console.log('textReply', textReply);

        ctx.session.update = message === "true"

        if (ctx.session.sendMessage) {
            const result = formatMessagee.editMessageOnlyText(ctx, textReply, buttonSaveAgain)

            if (!result) {
                console.log('Ошибка в исправлении сообщения!');
                await ctx.reply(textReply, {
                    parse_mode: 'HTML',

                }).then((sendMessage) => {
                    ctx.session.sendMessage = sendMessage.message_id;
                });
            }
        } else {
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...buttonSaveAgain
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }

        return ctx.wizard.next();
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        return
    }

    if (!ctx.from?.id) {
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        switch (message) {
            case 'again':
                await ctx.scene.enter('editGender');
                break

            case 'save':
                const updateMessage = formatMessagee.deleteMessage(ctx);

                if (!updateMessage) {
                    console.log('Ошибка в удалении сообщения');
                }

                const saveUser = await updateUser(ctx.from?.id, { gender: ctx.session.update })

                if (!saveUser) {
                    await ctx.reply('⚠️ Не удалось сохранить. Запустите меню заново через /profile и попробуй еще раз.');
                }

                return ctx.scene.enter('profile');
            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
});

export const editGenderSearch = new Scenes.WizardScene<MyContext>('editGenderSearch', async (ctx) => {
    const textReply = 'Выберете пол поиска';

    const replyMarkup = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Мужской',
                        callback_data: 'false'
                    }
                ],
                [
                    {
                        text: 'Женский',
                        callback_data: 'true'
                    }
                ]
            ]
        }
    };

    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return ctx.wizard.next();
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        console.log('1232231312')
        await ctx.reply('⚠️ Используйте кнопки!')
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        const deleteMessageProfile = await formatMessagee.deleteProfileMessage(ctx);

        if (!deleteMessageProfile) {
            console.error('Ошибка в удалении сообщения')
        }

        console.log('message', message);

        const textReply = `Ваш пол поиска: ${message === "false" ? '<b>мужской</b>' : '<b>женский</b>'} ?`

        ctx.session.update = message === "true"

        if (ctx.session.sendMessage) {
            const result = formatMessagee.editMessageOnlyText(ctx, textReply, buttonSaveAgain)

            if (!result) {
                console.log('Ошибка в исправлении сообщения!');
                await ctx.reply(textReply, {
                    parse_mode: 'HTML',

                }).then((sendMessage) => {
                    ctx.session.sendMessage = sendMessage.message_id;
                });
            }
        } else {
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...buttonSaveAgain
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }

        return ctx.wizard.next();
    }
}, async (ctx) => {
    if (!ctx.callbackQuery) {
        return
    }

    if (!ctx.from?.id) {
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        switch (message) {
            case 'again':
                await ctx.scene.enter('editGender');
                break

            case 'save':
                const updateMessage = formatMessagee.deleteMessage(ctx);

                if (!updateMessage) {
                    console.log('Ошибка в удалении сообщения');
                }

                const saveUser = await updateUser(ctx.from?.id, { searchGender: ctx.session.update })

                if (!saveUser) {
                    await ctx.reply('⚠️ Не удалось сохранить. Запустите меню заново через /profile и попробуй еще раз.');
                }

                return ctx.scene.enter('profile');
            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
});

export const Statistic = new Scenes.WizardScene<MyContext>('statistic', async (ctx) => {
    const url = process.env.URL;

    try {
        const getUser = await axios.get(`${url}/user/${ctx.from?.id}`, {
            validateStatus: () => true
        });

        if (getUser.status === 404) {
            throw new Error(JSON.stringify(getUser.data.message))
        }

        const userData = getUser.data.message;

        console.log('userData.ratingViewed', userData.ratingViewed);
        console.log('userData.coinViewed', userData.coinViewed);

        const text = `
📊 <b>Управление статистикой:</b>
        
1️⃣ <b>Рейтинг</b> ${userData.ratingViewed === true ? '(Открыть)' : '(Скрыть)'} 
2️⃣ <b>Коины</b> ${userData.coinViewed === true ? '(Открыть)' : '(Скрыть)'}  
        
📌 Выберите действие, нажав на соответствующую кнопку ниже.
`
        const replyMarkup = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '1', callback_data: 'stat-1' },
                        { text: '2', callback_data: 'stat-2' }
                    ]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        };

        ctx.session.viewed = {
            coin: userData.coinViewed,
            rating: userData.ratingViewed
        }

        const resSendMessage = await sendMessage(ctx, text, replyMarkup);

        if (resSendMessage) {
            console.log('sucsess');
        }

        return ctx.wizard.next();
    } catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error(err);
        }
        const textReply = '⚠️ Произошла ошибка при проверке статуса премиума. Запустите меню заново через /profile и попробуй еще раз.';

        const replyMarkup = {};

        const resSendMessage = await sendMessage(ctx, textReply, replyMarkup);

        if (resSendMessage) {
            console.log('sucsess');
        }

    }


}, async (ctx) => {
    const url = process.env.URL;

    const editStatisticFn = async (type: EditStatistick, id: number) => {
        try {
            const req = await axios.put(`${url}/user/statistic/${id}`, type, {
                validateStatus: () => true
            });

            if (req.status === 400) {
                throw new Error(JSON.stringify(req.data.message));
            }

            return true
        } catch (err) {
            if (err instanceof Error) {
                console.error('err in editStatistick' + err.message)
            } else {
                console.error('invalid err in editStatistick' + err);
            }

            return false
        }
    }

    if (!ctx.callbackQuery) {
        return
    }

    if (!ctx.from?.id) {
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        switch (message) {
            case 'stat-1':
                const result = await editStatisticFn({ ratingViewed: !ctx.session.viewed.rating }, ctx.from.id);

                if (!result) {
                    const text = '⚠️ Не удалось скрыть статистику. Запустите меню заново через /profile и попробуй еще раз.';

                    const resSendMessage = await sendMessage(ctx, text, {});

                    return ctx.scene.enter('profile');
                }

                const deleteMessage = formatMessagee.deleteMessage(ctx);

                return ctx.scene.enter('profile');

            case 'stat-2':
                const result2 = await editStatisticFn({ coinViewed: !ctx.session.viewed.coin }, ctx.from.id);

                if (!result2) {
                    const text = '⚠️ Не удалось скрыть статистику. Запустите меню заново через /profile и попробуй еще раз.';

                    const resSendMessage = await sendMessage(ctx, text, {});

                    return ctx.scene.enter('profile');
                }

                const deleteMessage2 = formatMessagee.deleteMessage(ctx);

                return ctx.scene.enter('profile');
            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
});

export const PremiumScene = new Scenes.WizardScene<MyContext>('premiumScene', async (ctx) => {
    const text = `
🔥 Станьте обладателем ⭐️ PREMIUM ⭐️ и разблокируйте уникальные возможности:

1️⃣ 🔍 Приоритет в поиске: Ваша анкета будет отображаться выше других и попадаться чаще!
2️⃣ 🛡️ Скрытие характеристик: Управляйте видимостью рейтинга и количества коинов.
3️⃣ 💠 Премиум-иконка: Вместо 💘 рядом с анкетой появится ⭐️ — знак статуса и привилегий.

🛒 Купить премиум можно в боте: @nexycon_bot
`;

    const send = await sendMessage(ctx, text, {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '⭐️ Купить премиум', url: 'https://t.me/nexycon_bot' },
                ],
                [
                    { text: '⬅️ Назад', callback_data: 'exit' }
                ]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });

    return ctx.wizard.next();

}, async (ctx) => {
    if (!ctx.callbackQuery) {
        if (ctx.message !== undefined) {
            if ('text' in ctx.message) {
                await handleCommand(ctx);
            }
        }
        return
    }

    if ("data" in ctx.callbackQuery) {
        const message = ctx.callbackQuery.data;

        if (message === 'exit') {
            const deleteMessage2 = formatMessagee.deleteMessage(ctx);
            const deleteProfileMessage = formatMessagee.deleteProfileMessage(ctx);

            return ctx.scene.enter('profile');
        } else {
            const text = `⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.`;

            const send = await sendMessage(ctx, text, {});
        }
    }
})

const updateUser = async (id: number, body: UserPUT) => {
    try {
        const url = process.env.URL;

        const req = await axios.put(`${url}/user/${id}`, body, {
            validateStatus: () => true
        })

        if (req.status === 400) {
            throw new Error(JSON.stringify(req.data.message))
        }

        return true
    } catch (err) {
        const resultError = ErrorFn('Ошибка в обновлении юзера', err);

        return resultError
    }
}

const sendMessage = async (ctx: MyContext, textReply: string, replyMarkup: any) => {
    if (ctx.session.sendMessage) {
        const result = formatMessagee.editMessageOnlyText(ctx, textReply, replyMarkup)

        if (!result) {
            console.log('Ошибка в исправлении сообщения!');
            await ctx.reply(textReply, {
                parse_mode: 'HTML',
                ...replyMarkup
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });
        }
    } else {
        await ctx.reply(textReply, {
            parse_mode: 'HTML',
            ...replyMarkup
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });
    }

    return true
}