const express = require("express")
const router = express.Router()

const { login, logout, register } = require("../controllers/auth.js")
const { refreshToken } = require('../controllers/refreshtoken.js')

router.post("/login", login)
router.post("/register", register)
router.post("/logout", logout)
router.get("/token", refreshToken)

module.exports = router