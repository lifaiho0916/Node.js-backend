const { uploadPartPreview, uploadMachinePreview } = require('../config/multer')
const Machine = require('../models/Machine')
const Part = require('../models/Part')
const { getModel, getCurrentTime, getPeriodOfTimer } = require('../helpers/functions')
const Timer = require('../models/Timer')
const TimerLog = require('../models/TimerLog')
const Job = require('../models/Job')

const createMachine = async (req, res) => {
  try {
    const machine = new Machine({
      ...req.body,
      preview: "/uploads/machines/"+req.file.filename
    })
    await machine.save()
    return res.send({machine})
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const createPart = async (req, res) => {
  try {
    const part = new Part({
      ...req.body,
      preview: "/uploads/parts/"+req.file.filename
    })
    await part.save()
    return res.send({part})
  } catch (err) {
    res.sendStatus(500)
  }
}

const createTimer = async (req, res) => {
  try {
    const timer = new Timer({
      ...req.body,
      times: [],
    })
    await timer.save()
    const _timer = await Timer.findOne({ _id: timer._id }).populate("machine").populate("part").lean()
    res.send({ timer: {
      ..._timer,
      time: 0,
      totalTime: 0,
      latest: [],
      dailyTon: 0,
      dailyUnit: 0
    }})
  } catch(err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const getProducts = async(req, res) => {
  try {
    const model = getModel(req.body.type)
    let products

    if (req.body.type == "Timer") {
      products = await Timer.find({}).sort({createdAt: -1}).populate("machine").populate("part").limit(20)
      let _products = []
      for (product of products) {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const timerLogs = await TimerLog
          .find({ timer: product._id, createdAt: {$gte: startOfToday} })
          .sort({createdAt: -1})
        const logsOfDay = await TimerLog
          .find({ timer: product._id, createdAt: {$gte: startOfToday} })
          .sort({createdAt: -1})
        let dailyUnit = 0
        let dailyTon = 0
        let totalTime = 0
        for (const log of logsOfDay) {
          const time = getPeriodOfTimer(log.times)
          dailyTon += log.weight
          dailyUnit++
          totalTime += time
        }

        _products.push({
          city: product.city,
          factory: product.factory,
          name: product.name,
          part: product.part,
          machine: product.machine,
          weight: product.weight,
          productionTime: product.productionTime,
          status: product.status,
          times: product.times,
          latest: timerLogs.length ? timerLogs[0].times : [],
          _id: product._id,
          dailyTon,
          dailyUnit,
          totalTime
        })
      }
      return res.send({ products: _products })
    } else {
      products = await model.find({}).sort({createdAt: -1})
    }
    res.send({ products })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const getTimer = async (req, res) => {
  try {
    const timer = await Timer.findOne({ _id: req.query.id }).populate("machine").populate("part")

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timerLogs = await TimerLog.find({ timer: req.query.id }).sort({createdAt: -1})
    const logsOfDay = await TimerLog.find({ timer: timer._id, createdAt: {$gte: startOfToday} }).sort({createdAt: -1})
    let dailyUnit = 0
    let dailyTon = 0
    let totalTime = 0
    for (const log of logsOfDay) {
      const time = getPeriodOfTimer(log.times)
      if (log.weight)
        dailyTon += log.weight
      dailyUnit++
      totalTime += time
    }

    const _timer = {
      city: timer.city,
      factory: timer.factory,
      name: timer.name,
      part: timer.part,
      machine: timer.machine,
      weight: timer.weight,
      productionTime: timer.productionTime,
      status: timer.status,
      times: timer.times,
      latest: timerLogs.length ? timerLogs[0].times : [],
      _id: timer._id,
      dailyTon,
      dailyUnit,
      totalTime
    }
    res.send({ timer: _timer })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const deleteProduct = async (req, res) => {
  try {
    const model = getModel(req.body.type)
    await model.deleteOne({ _id: req.body.id })
    res.sendStatus(200)
  } catch (err) {
    res.sendStatus(500)
  }
}

const editProduct = async (req, res) => {
  try {
    const model = getModel(req.body.type)
    await model.findOneAndUpdate({
      _id: req.body.id
    }, {
      ...req.body.updates
    })
  } catch (err) {

  }
}

const startTimer = async (req, res) => {
  try {
    const timer = await Timer.findOne({ _id: req.body.id })
    const time = new Date(req.body.time)
    if (timer.status == "Pending") {
      const length = timer.times.length
      timer.times = [
        ...timer.times,
        {
          startTime: time,
          endTime: undefined
        }
      ]
    }
    timer.status = "Started"
    await timer.save()
    req.io.emit("timerUpdated", timer._id, timer.machine)
    res.sendStatus(200)
  } catch(err) {
    res.sendStatus(500)
  }
}

const endTimer = async (req, res) => {
  try {
    const timer = await Timer.findOne({ _id: req.body.id })
    const now = new Date(req.body.time)

    if (timer.status == "Pending")
      return res.sendStatus(200)

    if (timer.status == "Started")
      await stopTimerHandler(timer, req.body.time)
    
    const timerLog = new TimerLog({
      timer,
      startTime: timer.times[0].startTime,
      endTime: now,
      productionTime: timer.productionTime,
      weight: timer.productionTime,
      times: timer.times
    })
    req.io.emit("timerUpdated", timer._id, timer.machine)
    await timerLog.save()

    const job = await Job.findOne({
      part: timer.part,
      machine: timer.machine,
      active: true
    })

    if (job) {
      job.producedCount++
      await job.save()
    }

    timer.endTime = now
    timer.status = "Pending"
    timer.times = []
    await timer.save()
    
    res.sendStatus(200)
  } catch(err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const stopTimerHandler = async (timer, time) => {
  if (timer.status == "Started") {
    const length = timer.times.length
    timer.times[length - 1].endTime = time
    timer.status = "Pending"
    await timer.save()
  }
}

const stopTimer = async (req, res) => {
  try {
    const timer = await Timer.findOne({ _id: req.body.id })
    const time = new Date(req.body.time)
    await stopTimerHandler(timer, time)
    res.sendStatus(200)
  } catch (err) {
    res.sendStatus(500)
  }
}

const updateTimer = async (req, res) => {
  try {
    await Timer.findOneAndUpdate({
      _id: req.body.id
    }, {
      ...req.body.updates
    })
    res.sendStatus(200)
  } catch (err) {
    res.sendStatus(500)
  }
}

const searchMachines = async (req, res) => {
  try {
    const _machines = await Machine.find({
      machineClass: req.query.machineClass
    })
    const logs = await TimerLog.find({}).populate("timer")

    let machines = []
    for (const machine of _machines) {
      const length = logs.filter(log => {
        return log.timer.machine+"" == machine._id+""
      }).length
      if (length) machines.push(machine)
    }
    res.send({ machines })
  } catch (err) {
    console.log(err)
    return res.sendStatus(500)
  }
}

const getTimerLogsOfMachine = async (req, res) => {

  const ITEMS_PER_PAGE = 8

  try {
    const page = req.query.page || 1

    const { machine, part, from, to } = req.query
    let _logs = await TimerLog.find({
      createdAt: {
        $gte: new Date(from),
        $lt: new Date(to)
      },
    }).populate("timer")
      .populate({ path: "timer", populate: { path: "part" } })
      .sort({ createdAt: -1 })
      .lean()
    let totalTons = 0, totalGain = 0, totalLoss = 0, totalFloat = 0
    const logs = _logs
      .filter(log => log.timer.part._id == part && log.timer.machine == machine)
      .map(log => {
        const time = getPeriodOfTimer(log.times)
        totalTons += log.timer.weight
        if (log.productionTime > time) totalGain += (log.productionTime - time)
        else totalLoss -= (log.productionTime - time)

        return {
          ...log,
          time
        }
      })
    res.send({ 
      logs: logs.slice(((page - 1) * ITEMS_PER_PAGE), page * ITEMS_PER_PAGE), 
      total: logs.length, 
      totalTons,
      totalLoss,
      totalGain
    })
  } catch (err) {
    res.sendStatus(500)
  }
}

module.exports = { createMachine, createPart, createTimer, getProducts, editProduct, deleteProduct, startTimer, endTimer, stopTimer, updateTimer, getTimer, searchMachines, getTimerLogsOfMachine }