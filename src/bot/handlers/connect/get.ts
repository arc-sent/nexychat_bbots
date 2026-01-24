import { bot } from './../../index';
import { MyContext } from '../../stage';
import { Scenes } from "telegraf";

export const Connect = new Scenes.WizardScene<MyContext>('connect', async (ctx) => {
    await ctx.reply('Ты соеденен с юзером 7824477234!', {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Соеденен',
                        callback_data: 'otherHoro'
                    }
                ]
            ]
        }
    });

    return ctx.wizard.next();
}, async (ctx) => {
    if (ctx.message == undefined) {
        return
    }

    const userId = ctx.from?.id;
    const targetUserId = 7824477234;

    console.log(ctx.message);

    if ('text' in ctx.message) {
        bot.telegram.sendMessage(targetUserId, ctx.message.text);
    }

    else if ('photo' in ctx.message) {
        bot.telegram.sendPhoto(targetUserId, ctx.message.photo[ctx.message.photo.length - 1].file_id);
    }

    else if ('voice' in ctx.message) {
        bot.telegram.sendVoice(targetUserId, ctx.message.voice.file_id);
    }

    else if ('sticker' in ctx.message) {
        bot.telegram.sendSticker(targetUserId, ctx.message.sticker.file_id);
    }

    else if ('audio' in ctx.message) {
        bot.telegram.sendAudio(targetUserId, ctx.message.audio.file_id);
    }

    else if ('video_note' in ctx.message) {
        bot.telegram.sendVideoNote(targetUserId, ctx.message.video_note.file_id);
    }
})