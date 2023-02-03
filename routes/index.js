const express = require('express')
const authRouter = require("./auth.js")

const router = express.Router()

router.use("/api/auth", authRouter)

module.exports = router