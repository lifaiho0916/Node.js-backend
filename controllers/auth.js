const User = require("../models/User.js")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const register = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body
  if (password !== confirmPassword) return res.status(400).json({msg: "Password and Confirm Password does not match"})
  const salt = await bcrypt.genSalt(10)
  const hashPassword = await bcrypt.hash(password, salt)
  try {
    await User.create({
      name: username,
      email,
      password: hashPassword,
      role: "visitor"
    })
    res.json({msg: "Registeration Successful"});
  } catch (err) {
    console.log(err)
  }
}

const login = async(req, res) => {
  try {
    console.log(req.body)
    const user = await User.findAll({
      where: {
        email: req.body.email
      }
    });

    const match = await bcrypt.compare(req.body.password, user[0].password)
    if (!match) return res.status(400).json({msg: "Wrong Password"});

    const userId = user[0].id
    const name = user[0].name
    const email = user[0].email
    const accessToken = jwt.sign({ userId, name, email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15s" })
    const refreshToken = jwt.sign({ userId, name, email }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '1d' })
    
    await User.update({ refresh_token: refreshToken }, {
      where: {
        id: userId
      }
    })
    res.cookie('refreshToken', refreshToken, {
      maxAge: 24 * 60 * 60 * 1000
    })

    return res.json({ accessToken, refreshToken, user })
  } catch (err) {
    res.status(404).json({ msg: "Email not found" })
  }
}

const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  if (!refreshToken) return res.sendStatus(204)

  const user = await User.findAll({
    where: {
      refresh_token: refreshToken
    }
  })
  if (!user[0]) return res.sendStatus(204)
  const userId = user[0].id
  await User.update({ refresh_token: null }, {
    where: {
      id: userId
    }
  })
  res.clearCookie('refreshToken')
  return res.sendStatus(200)
}

module.exports = { login, logout, register }