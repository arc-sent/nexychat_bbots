//ANSWER

// if (ctx.message.reply_to_message) {
//     console.log('ctx.message.reply_to_message', ctx.message.reply_to_message);

//     const replyFrom = ctx.message.reply_to_message.from;

//     console.log('replyFrom', replyFrom);
//     if (replyFrom?.is_bot) {

//         // const forwarded = await bot.telegram.forwardMessage(
//         //     targetUserId,
//         //     ctx.chat.id,
//         //     ctx.message.reply_to_message.message_id
//         // );

//         const obj = { reply_to_message_id: ctx.message.reply_to_message.message_id } as any

//         await bot.telegram.sendMessage(
//             targetUserId,
//             ctx.message.text,
//             obj
//         );
//     }
// }