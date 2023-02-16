const Machine = require("../models/Machine")
const Part = require("../models/Part")
const Timer = require("../models/Timer")

const random = (from, to) => {
  return parseInt(Math.random() * (to - from) + from)
}

const getModel = (str) => {
  if (str == "Part") return Part
  if (str == "Timer") return Timer
  return Machine
}

module.exports = { random, getModel }