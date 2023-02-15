const Setting = require("../models/Setting")

const startTimer = async () => {

  const [setting] = await Setting.find({})

  global.remaining = setting.time
  setInterval(() => {
    global.remaining--
    setting.time = global.remaining
    setting.save()
  }, 1000)
}

module.exports = { startTimer }