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

module.exports = { createMachine, createPart, createTimer, getProducts, editProduct, deleteProduct, startTimer, endTimer, stopTimer, updateTimer }