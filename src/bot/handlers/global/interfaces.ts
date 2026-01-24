export interface RegisterBody {
    id: string,
    name: string,
    age: number,
    premium: boolean,
    gender: boolean,
    searchGender: boolean,
}

export interface ResponseResult {
    status: boolean;
    message: string | IUser;
}

export interface IUser {
    id: string;
    name: string;
    age: number;
    premium: boolean;
    gender: boolean;
    searchGender: boolean;
    rating: number;
    ratingViewed: boolean;
    coinViewed: boolean;
}

export interface CHANNELS {
    id: number,
    nickname: string
}
