import { PrismaClient } from "@prisma/client";

interface UserPost {
    id: string,
    name: string,
    age: number,
    premium: boolean,
    gender: boolean,
    searchGender: boolean,
    rating: number
}

interface UserPUT {
    name: string,
    age: number,
    gender: boolean,
    searchGender: boolean,
}

interface UserStatistic {
    coinViewed: boolean,
    ratingViewed: boolean
}

export class UserService {
    private prisma;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async POST(body: UserPost) {
        try {
            const createUser = await this.prisma.user.create({
                data: {
                    id: body.id,
                    name: body.name,
                    age: body.age,
                    premium: body.premium,
                    gender: body.gender,
                    searchGender: body.searchGender,
                    rating: 10.0
                }
            });

            if (!createUser) {
                throw new Error('Ошибка в создании юзера');
            }

            return { message: createUser, status: 200 }
        } catch (err) {
            return this._handleError(err)
        }
    }

    async GET(id: string) {
        try {
            const findUser = await this.prisma.user.findFirst({
                where: {
                    id: id
                }
            });

            if (!findUser) {
                return { message: 'Юзер не найден!', status: 404 }
            }

            return { message: findUser, status: 200 }
        } catch (err) {
            return this._handleError(err)
        }
    }

    async PUT(id: string, body: UserPUT) {
        try {
            const updateUser = await this.prisma.user.update({
                where: { id: id },
                data: {
                    name: body.name,
                    age: body.age,
                    gender: body.gender,
                    searchGender: body.searchGender
                }
            });

            console.log('updateUser', updateUser);

            if (!updateUser) {
                throw new Error('Ошибка в обновлении юзера');
            }

            return { message: updateUser, status: 200 }
        } catch (err) {
            return this._handleError(err)
        }
    }

    async STATISTIC(id: string, body: UserStatistic) {
        try {
            const findUser = await this.prisma.user.findFirst({
                where: {
                    id: id
                }
            });

            if (!findUser.premium) {
                throw new Error('У юзера нет премиума!');
            }

            const updateUser = await this.prisma.user.update({
                where: { id: id },
                data: {
                    coinViewed: body.coinViewed,
                    ratingViewed: body.ratingViewed
                }
            });

            console.log('updateUser', updateUser);

            if (!updateUser) {
                throw new Error('Ошибка в обновлении юзера');
            }

            return { message: updateUser, status: 200 }
        } catch (err) {
            return this._handleError(err)
        }
    }

    async RATING(id: string, body: { value: number }) {
        try {
            const { value } = body

            if (value < 1 || value > 10) {
                throw new Error("Оценка должна быть от 1 до 10")
            }

            const findUser = await this.prisma.user.findFirst({
                where: { id: id }
            });

            if (!findUser) {
                throw new Error('Пользователь не найдет')
            }

            const newRatingCount = findUser.ratingCount + 1;
            const newRatingSum = findUser.ratingSum + value;
            const newRatingRaw =  newRatingSum / newRatingCount;

            const newRating = Math.round(newRatingRaw * 100) / 100;

            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: {
                    ratingCount: newRatingCount,
                    ratingSum: newRatingSum,
                    rating: newRating
                }
            });

            return { message: updatedUser, status: 200 };
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