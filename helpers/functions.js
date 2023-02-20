const Machine = require("../models/Machine")
const Part = require("../models/Part")
const Timer = require("../models/Timer")
const moment = require("moment")

const random = (from, to) => {
  return parseInt(Math.random() * (to - from) + from)
}

const getModel = (str) => {
  if (str == "Part") return Part
  if (str == "Timer") return Timer
  return Machine
}

const getCurrentTime = () => {
  const now = new Date()
  console.log('here', now)
  const time = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000)
  const offset = -6 * 60 * 60 * 1000
  return new Date()
}

const getPeriodOfTimer = (times) => {
  let total = 0
  times.forEach(time => {
    total += ((new Date(time.endTime).getTime() - new Date(time.startTime).getTime()) / 1000)
  })
  return total
}

module.exports = { random, getModel, getCurrentTime, getPeriodOfTimer }