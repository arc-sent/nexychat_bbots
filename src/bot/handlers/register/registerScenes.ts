import axios from 'axios';
import { MyContext } from '../../stage';
import { Scenes } from "telegraf";
import { formatNumber } from '../global/function';
import { formatMessage, User } from '../global/calsses';
import { handleCommand } from '../../globalFn/handle';
import { formatMessagee } from '../global/calsses';

const UserClass = new User();

export const Register = new Scenes.WizardScene<MyContext>('register', async (ctx) => {
    try {
        const url = process.env.URL;
        const urlCon = process.env.URLCON;

        const reqInDb = await axios.get(`${url}/user/${ctx.from?.id}`, {
            validateStatus: () => true
        });

        if (reqInDb.status === 400) {
            throw new Error(JSON.stringify(reqInDb.data.message))
        }

        if (reqInDb.status === 404) {
            const req = await axios.get(`${urlCon}/users/${ctx.from?.id}`, {
                validateStatus: () => true
            });

            if (req.status === 400) {
                await ctx.reply('⚠️ Чтобы воспользоваться этим ботом, тебе нужно сначала пройти регистрацию в @nexycon_bot.')
                return ctx.scene.leave();
            }

            const userData = req.data.message;
            console.log('userData', userData.coin);

            const formatGems = formatNumber(userData.coin)

            ctx.session.register = {
                id: `${ctx.from?.id}`,
                name: userData.name,
                age: userData.age,
                premium: userData.premium,
                gender: userData.gender,
                searchGender: userData.searchGender,
            }

            await ctx.reply(`
<b>${userData.premium ? '⭐ PREMIUM ⭐' : '💘 Анкета пользователя'}</b>
<b>⭐️ Рейтинг: 10.0</b> 
———————————————
<b>${userData.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${userData.name}  
<b>🎂 Возраст:</b> ${userData.age}
<b>${userData.searchGender ? '👱🏻‍♀️' : '👱🏻'} Пол поиска:</b> Женский
———————————————
<b>💠 Гемы:</b> ${formatGems}          
    ` , {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Сохранить',
                                callback_data: 'save'
                            }
                        ],
                        [
                            {
                                text: 'Заполнить заново',
                                callback_data: 'refresh'
                            }
                        ]
                    ]
                },
                parse_mode: 'HTML'
            }).then((sendMessage) => {
                ctx.session.sendMessage = sendMessage.message_id;
            });

            return ctx.wizard.next();
        }

        return ctx.scene.enter('profile');
    } catch (err) {
        if (err instanceof Error) {
            console.error(`Ошибка при получении данных пользователя: ${err.message}`)
        } else {
            console.error(`Ошибка при получении данных пользователя. Ошибка неизвестная: ${err}`)
        }

        await ctx.reply('Ошибка при получении данных пользователя! Попробуйте позже.')
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

    if ("data" in ctx.callbackQuery) {
        const dataButton = ctx.callbackQuery.data;

        const deleteMessage2 = formatMessagee.deleteMessage(ctx);

        switch (dataButton) {
            case 'save':
                const result = await UserClass.registerUser(ctx.session.register);

                console.log('result', result);

                if (!result.status) {
                    await ctx.reply('⚠️ Что-то пошло не так. Пожалуйста, перезапустите регистрацию и попробуйте снова.');
                    return ctx.scene.leave();
                }

                return ctx.scene.enter('profile')

            case 'refresh':
                return ctx.scene.enter('registerRefresh')

            default:
                break
        }
    }
});

export const RegisterRefresh = new Scenes.WizardScene<MyContext>('registerRefresh', async (ctx) => {
    await ctx.reply('Как вас зовут?');
    return ctx.wizard.next()
}, async (ctx) => {
    if (!ctx.message) {
        await ctx.reply('⚠️ Используйте текст!')
        return
    }

    if ("text" in ctx.message) {
        console.log(ctx.message.text);

        ctx.session.register.name = ctx.message.text;

        await ctx.reply('Сколько вам лет? Введите возраст от 0 до 99 лет');

        return ctx.wizard.next()
    }
}, async (ctx) => {
    if (!ctx.message) {
        await ctx.reply('⚠️ Используйте текст!')
        return
    }

    if ("text" in ctx.message) {
        const age = ctx.message.text

        if (!(/^\d{1,2}$/.test(age) && Number(age) >= 0 && Number(age) <= 99)) {
            await ctx.reply('⚠️ Введите свой возраст от 0 до 99 лет');
            return
        }

        ctx.session.register.age = Number(age);

        const body = {
            name: ctx.session.register.name,
            age: ctx.session.register.age,
            premium: ctx.session.register.premium,
            gender: ctx.session.register.gender,
            searchGender: !ctx.session.register.gender,
        }

        await ctx.reply(`
<b>💘 Анкета пользователя</b>
<b>⭐️ Рейтинг: 10.0</b> 
———————————————
<b>${body.gender ? '👱🏻‍♀️' : '👱🏻'} Имя:</b> ${body.name}  
<b>🎂 Возраст:</b> ${body.age}
<b>${body.searchGender ? '👱🏻‍♀️' : '👱🏻'} Пол поиска:</b> Женский
` , {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Сохранить',
                            callback_data: 'save'
                        }
                    ],
                    [
                        {
                            text: 'Заполнить заново',
                            callback_data: 'refresh'
                        }
                    ]
                ]
            },
        }).then((sendMessage) => {
            ctx.session.sendMessage = sendMessage.message_id;
        });

        return ctx.wizard.next()
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
        const deleteMessage = formatMessagee.deleteMessage(ctx);

        switch (message) {
            case 'save':
                const result = await UserClass.registerUser(ctx.session.register);

                console.log('result', result);

                if (!result.status) {
                    await ctx.reply('⚠️ Что-то пошло не так. Пожалуйста, перезапустите регистрацию и попробуйте снова.');
                    return ctx.scene.leave();
                }

                return ctx.scene.enter('profile')

            case 'refresh':

                return ctx.scene.enter('registerRefresh')
            default:
                await ctx.reply('⚠️ Вы нажали что-то не то! Запустите меню заново через /profile и попробуй еще раз.')
                break
        }
    }
})