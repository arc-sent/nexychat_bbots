import { Router } from 'express';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';

const router = Router();

const service = new UserService();
const controller = new UserController(service);

router.post('/', (req, res) => {
    controller.POST(req, res);
});

router.get('/:id', (req, res) => {
    controller.GET(req, res);
});

router.put('/:id', (req, res) => {
    controller.PUT(req, res);
});

router.put('/statistic/:id', (req, res) => {
    controller.STATISTIC(req, res);
});

router.put('/rating/:id', (req, res) => {
    controller.RATING(req, res);
})

export const UserRouter = router;