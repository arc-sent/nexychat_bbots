import { UserService } from "../services/user.service";
import type { Request, Response } from "express";

export class UserController {
    private service;

    constructor(service: UserService) {
        this.service = service
    }

    async POST(req: Request, res: Response) {
        try {
            const body = req.body;

            if (!body) {
                throw new Error('Ошибка в получении тела')
            }

            const reqService = await this.service.POST(body);

            if (reqService.status === 400) {
                throw new Error(JSON.stringify(reqService.message));
            }

            res.status(200).json({ message: reqService.message })
        } catch (err) {
            if (err instanceof Error) {
                res.status(400).json({ message: err.message })
            } else {
                res.status(400).json({ message: `Invalid err: ${err}` })
            }
        }
    }

    async GET(req: Request, res: Response) {
        try {
            const id = req.params.id;

            if (!id) {
                throw new Error('Ошибка в получении айди')
            }

            const reqService = await this.service.GET(id);

            if (reqService.status === 400) {
                throw new Error(JSON.stringify(reqService.message));
            }

            if (reqService.status === 404) {
                res.status(404).json({ message: reqService.message })
                return
            }

            res.status(200).json({ message: reqService.message })
        } catch (err) {
            if (err instanceof Error) {
                res.status(400).json({ message: err.message })
            } else {
                res.status(400).json({ message: `Invalid err: ${err}` })
            }
        }
    }

    async PUT(req: Request, res: Response) {
        try {
            const id = req.params.id;

            if (!id) {
                throw new Error('Ошибка в получении айди')
            }

            const body = req.body;

            if (!body) {
                throw new Error('Ошибка в получении тела')
            }

            const reqService = await this.service.PUT(id, body);

            if (reqService.status === 400) {
                throw new Error(JSON.stringify(reqService.message));
            }

            res.status(200).json({ message: reqService.message })
        } catch (err) {
            this._handleError(res, err);
        }
    }

    async STATISTIC(req: Request, res: Response) {
        try {
            const id = req.params.id;

            if (!id) {
                throw new Error('Ошибка в получении айди')
            }

            const body = req.body;

            if (!body) {
                throw new Error('Ошибка в получении тела')
            }

            const reqService = await this.service.STATISTIC(id, body);

            if (reqService.status === 400) {
                throw new Error(JSON.stringify(reqService.message));
            }

            res.status(200).json({ message: reqService.message })
        } catch (err) {
            this._handleError(res, err);
        }
    }

    async RATING(req: Request, res: Response) {
        try {
            const id = req.params.id;

            if (!id) {
                throw new Error('Ошибка в получении айди')
            }

            const body = req.body;

            if (!("value" in body)) {
                throw new Error('Отсуствует поле value')
            }

            const reqService = await this.service.RATING(id, body);

            if (reqService.status === 400) {
                throw new Error(JSON.stringify(reqService.message));
            }

            res.status(200).json({ message: reqService.message })
        } catch (err) {
            this._handleError(res, err);
        }
    }

    _handleError(res, err) {
        if (err instanceof Error) {
            res.status(400).json({ message: err.message })
        } else {
            res.status(400).json({ message: `Invalid err: ${err}` })
        }
    }
}