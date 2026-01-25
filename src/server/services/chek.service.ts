import { PrismaClient } from "@prisma/client";

export class CheckService {
    private prisma;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async clearAllStoryChats() {

        try {
            console.log('🧹 Очистка storyChats у всех пользователей...');

            await this.prisma.story.deleteMany({});

            console.log('✅ storyChats успешно очищены');
        } catch (err) {
            return this._handleError(err)
        }
    }

    private _handleError(err) {
        if (err instanceof Error) {
            return { message: err.message, status: 400 };
        } else {
            console.error(err);
            return { message: "Unknown error", status: 400 };
        }
    }
}