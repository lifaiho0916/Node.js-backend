const express = require("express")
const router = express.Router()

const { login, logout, register, allUsers, approveUser } = require("../controllers/auth.js")
const { refreshToken } = require('../controllers/refreshtoken.js')
const { verifyAdmin } = require('../middleware/adminMiddleware')

router.post("/login", login)
router.post("/register", register)
router.post("/logout", logout)
router.get("/token", refreshToken)
router.get("/all-users", allUsers)
router.post("/approve-user", verifyAdmin, approveUser)

module.exports = router