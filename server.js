const express = require('express')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const db = require('./config/database.js')
const router = require("./routes/index.js")

dotenv.config({path: __dirname + '/.env'});

const app = express()

app.use(cors({ credentials: true, origin: "http://localhost:3000" }))
app.use(cookieParser())
app.use(express.json())
app.use(router)

app.listen(8000, () => { console.log("server running at port 8000") })