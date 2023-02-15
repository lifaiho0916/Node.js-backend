const random = (from, to) => {
  return parseInt(Math.random() * (to - from) + from)
}

module.exports = { random }