import express from 'express'

import { signup, login, protect, restrictTo, updateMyPassword } from '../controllers/authController'
import { UserRole } from '../models/userModel'
import { filterBody, me, getAllUsers, getUser, updateUser, deleteUser } from '../controllers/userController'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)

router.use(protect)

router.get('/me', me, getUser)
router.patch('/updateMe', filterBody, me, updateUser)
router.patch('/updateMyPassword', updateMyPassword)

router.get('/', getAllUsers)

router
    .route('/:id')
    .get(getUser)
    .patch(restrictTo(UserRole.Admin), filterBody, updateUser)
    .delete(restrictTo(UserRole.Admin), deleteUser)

export default router