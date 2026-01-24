import axios from "axios";
import { RegisterBody, ResponseResult, IUser } from "./interfaces";
import dotenv from 'dotenv';

dotenv.config();

export class formatMessage {
    async editMessage(ctx: any) {
        try {
            await ctx.telegram.editMessageReplyMarkup(
                ctx.chat.id,
                ctx.session.sendMessage,
                undefined,
                null
            );
            return true
        } catch (err) {
            console.error(err);

            return false
        }
    }

    async editMessageById(ctx: any, id: number) {
        try {
            await ctx.telegram.editMessageReplyMarkup(
                ctx.chat.id,
                id,
                undefined,
                null
            );
            return true
        } catch (err) {
            console.error(err);

            return false
        }
    }

    async editMessageMorGems(ctx: any, text: string, markup: any) {
        try {
            await ctx.telegram.editMessageCaption(
                ctx.chat.id,
                ctx.session.sendMessage,
                undefined,
                text,
                {
                    parse_mode: "HTML",
                    ...markup
                }
            );
            return true
        } catch (err) {
            console.error(err);
            return false
        }
    }

    async editMessageOnlyText(ctx: any, text: string, markup: any) {
        try {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                ctx.session.sendMessage,
                undefined,
                text,
                {
                    parse_mode: "HTML",
                    ...markup
                }
            );
            return true
        } catch (err) {
            console.error(err);
            return false
        }
    }

    async deleteMessage(ctx: any) {
        try {
            await ctx.deleteMessage(ctx.session.sendMessage);
            return true
        } catch (err) {
            console.error(err);
            return false
        }

    }

    async deleteMessageById(ctx: any, id: number) {
        try {
            await ctx.deleteMessage(id);
            return true
        } catch (err) {
            console.error(err);
            return false
        }

    }

    async deleteProfileMessage(ctx) {
        try {
            await ctx.deleteMessage(ctx.session.sendMessageProfile);
            return true
        } catch (err) {
            console.error(err);
            return false
        }
    }
}

export class User {
    private userurl

    constructor() {
        this.userurl = `${process.env.URL}/user`;
    }

    async registerUser(body: RegisterBody): Promise<ResponseResult> {
        try {
            console.log('this.userurl', this.userurl);

            const createUser = await axios.post(this.userurl, body, {
                validateStatus: () => true
            });

            if (createUser.status === 400) {
                throw new Error(JSON.stringify(createUser.data.message));
            }

            return { status: true, message: 'Успешное создание юзера!' }

        } catch (err) {
            const errResult = await this._Error(err, 'Регистрация юзера');

            return errResult
        }
    }

    async getUser(id: number): Promise<ResponseResult> {
        try {
            const getUser = await axios.get(`${this.userurl}/${id}`);

            if (!getUser) {
                throw new Error('Ошибка в получении юзера');
            }

            return { status: true, message: getUser.data.message }
        } catch (err) {
            const errResult = await this._Error(err, 'Получение юзера');

            return errResult
        }
    }

    private async _Error(err, message: string) {
        let errMessage = '';
        if (err instanceof Error) {
            errMessage = `${message}: ${err.message}`;
            console.error(`${err.message}`)
        } else {
            errMessage = `${message}: Ошибка неизвестная`;
            console.error(`Ошибка неизвестная: ${err}`)
        }

        return { status: false, message: errMessage }
    }
}

export const formatMessagee = new formatMessage();