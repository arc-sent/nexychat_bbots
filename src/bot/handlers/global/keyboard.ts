export const buttonSaveAgain = {
    reply_markup: {
        inline_keyboard: [
            [
                {
                    text: 'Заполнить заново',
                    callback_data: 'again'
                }
            ],
            [
                {
                    text: 'Сохарнить',
                    callback_data: 'save'
                }
            ]
        ]
    }
}