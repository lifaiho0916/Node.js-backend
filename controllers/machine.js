const { uploadPartPreview, uploadMachinePreview } = require('../config/multer')
const Machine = require('../models/Machine')
const Part = require('../models/Part')
const { getModel, getCurrentTime, getPeriodOfTimer, paginate } = require('../helpers/functions')
const Timer = require('../models/Timer')
const TimerLog = require('../models/TimerLog')
const Job = require('../models/Job')

const moment=require("moment")
const { startProductionLog, getStartProductionTime } = require('../models/ProductionClock')

const createMachine = async (req, res) => {
  try {
    let machine
    const preview = req.file ? "/uploads/machines/"+req.file.filename : ""

    if (req.body.id) {
      machine = await Machine.findOne({ _id: req.body.id })
      Object.entries(req.body).forEach(v => {
        machine[v[0]] = v[1]
      })
      machine.preview = preview ? preview : machine.pewview
      await machine.save()
    } else {
      machine = new Machine({
        ...req.body,
        preview
      })
      await machine.save()
    }
    
    return res.send({machine})
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const createPart = async (req, res) => {
  try {
    const preview = req.file?"/uploads/parts/"+req.file.filename:""
    let part
    if (req.body.id) {
      part = await Part.findOne({ _id: req.body.id })
      Object.entries(req.body).forEach(v => {
        part[v[0]] = v[1]
      })
      part.preview = preview ? preview : part.pewview
      await part.save()
    } else {
      part = new Part({
        ...req.body,
        preview
      })
      await part.save()
    }
    
    return res.sendStatus(200)
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const createTimer = async (req, res) => {
  try {

    let options = {upsert: true, new: true, setDefaultsOnInsert: true};
    const timer = await Timer.findOneAndUpdate(
      { machine: req.body.machine },
      {
        ...req.body,
        times: []
      },
      options
    )
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
    let totalCount

    const ITEMS_PER_PAGE = 9
    const page = req.body.page || 1
    const filters = req.body.filters

    if (req.body.type == "Timer") {
      products = await Timer
                        .find({})
                        .sort({createdAt: -1})
                        .populate("machine")
                        .populate("part")

      if (filters)
        products = products.filter(p => (
          filters.factories.includes(p.factory) && filters.city==p.city
        ))
      
      totalCount = products.length
      products = paginate(products, page, ITEMS_PER_PAGE)

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
          totalTime,
          operator: product.operator
        })
      }
      return res.send({ products: _products, totalCount })
    } else {
      products = await model
        .find({})
        .sort({createdAt: -1})

      if (filters) {
        const { factory, city, machineClass } = filters

        products = products.filter(p => {
          if (factory && p.factory != factory) return false
          if (city && p.city != city) return false
          if (machineClass && p.machineClass != machineClass) return false
          return true
        })
      }

      totalCount = products.length
      if (page != -1)
        products = paginate(products, page, ITEMS_PER_PAGE)
    }
    res.send({ products, totalCount })
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
      totalTime,
      operator: timer.operator
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
    let timers = [], timerIds = []
    if (req.body.city) {
      timers = await Timer.find({ city: req.body.city })
      startProductionLog(req.body.city)
    }
    else {
      timers = await Timer.find({ _id: req.body.id })
      console.log(timers.length)
      if (timers.length)
        startProductionLog(timers[0].city)
    }

    for (const timer of timers) {
      const time = new Date(req.body.time)
      if (timer.status == "Pending") {
        timer.times = [
          ...timer.times,
          {
            startTime: time,
            endTime: undefined
          }
        ]
        timer.status = "Started"
        timerIds.push(timer._id)
        await timer.save()
      }
    }
    
    req.io.emit("timerUpdated", timerIds)
    res.sendStatus(200)
  } catch(err) {
    res.sendStatus(500)
  }
}

const endTimer = async (req, res) => {
  try {
    let timers = [], timerIds = []
    if (req.body.city) timers = await Timer.find({city: req.body.city})
    else timers = await Timer.find({ _id: req.body.id })

    const lastTimer = await TimerLog.findOne({}, {}, { sort: { createdAt: -1 } }).lean()
    let id = lastTimer.id > 900000 ? lastTimer.id : 900000

    for (const timer of timers) {
      const now = new Date(req.body.time)

      if (timer.status == "Pending")
        continue

      if (timer.status == "Started")
        await stopTimerHandler(timer, req.body.time)
      
      const timerLog = new TimerLog({
        timer,
        startTime: timer.times[0].startTime,
        endTime: now,
        productionTime: timer.productionTime,
        weight: timer.weight,
        times: timer.times,
        part: timer.part,
        operator: timer.operator,
        id: ++id
      })
      timerIds.push(timer._id)
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
    }
    req.io.emit("timerUpdated", timerIds)
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

  const ITEMS_PER_PAGE = req.query.items_per_page || 8
  const today = moment().startOf('day')

  try {
    const page = req.query.page || 1
    const includeOperator = req.query.includeOperator=="true"

    let { machine, part, from, to, machineClass, city } = req.query
    let _logs

    if (machine == "0") machine = null
    if (part == "0") part = null
    if (machineClass == "0") machineClass = null
    if (city == "0") city = null
    if (!from) from = today.toDate()
    if (!to) to = moment(today).endOf('day').toDate()
    _logs = await TimerLog.find({
      createdAt: {
        $gte: new Date(from),
        $lt: new Date(to)
      },
    }).populate("timer")
      .populate("part")
      .populate({
        path: "timer",
        populate: {
          path: "machine"
        }
      })
      .sort({ createdAt: -1 })
      .lean()
    let totalTons = 0, totalGain = 0, totalLoss = 0, totalFloat = 0
    let logs = _logs
      .filter(log => {
        if (part && log.timer.part._id != part) return false
        if (machine && log.timer.machine._id != machine) return false
        if (machineClass && log.timer.machine.machineClass != machineClass) return false
        if (city && log.timer.city != city) return false
        return true
      })
      .map(log => {
        const time = getPeriodOfTimer(log.times)
        totalTons += log.timer.weight
        if (log.productionTime > time) totalGain += (log.productionTime - time)
        else totalLoss -= (log.productionTime - time)

        return {
          ...log,
          time,
          operator: includeOperator ? log.operator : ""
        }
      })
    const totalPage = Math.ceil(logs.length / ITEMS_PER_PAGE)
    logs = paginate(logs, 1, ITEMS_PER_PAGE)
    res.send({ 
      logs, 
      total: logs.length, 
      totalPage,
      totalTons,
      totalLoss: totalLoss / logs.length,
      totalGain: totalGain / logs.length
    })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const getLogsToPrint = async (req, res) => {

  const ITEMS_PER_PAGE = req.query.items_per_page || 8
  const today = moment().startOf('day')

  try {
    const page = req.query.page || 1
    const includeOperator = req.query.includeOperator=="true"

    let { machine, part, from, to, machineClass, city } = req.query
    let _logs
    _logs = await TimerLog.find({
      createdAt: {
        $gte: new Date(from),
        $lt: new Date(to)
      },
    }).populate("timer")
      .populate("part")
      .populate({
        path: "timer",
        populate: {
          path: "machine"
        }
      })
      .sort({ createdAt: -1 })
      .lean()
    let totalTons = 0, totalGain = 0, totalLoss = 0, totalFloat = 0
    let logs = _logs
      .filter(log => {
        if (machineClass && log.timer.machine.machineClass != machineClass) return false
        if (city && log.timer.city != city) return false
        return true
      })
      .map(log => {
        const time = getPeriodOfTimer(log.times)
        totalTons += log.timer.weight
        if (log.productionTime > time) totalGain += (log.productionTime - time)
        else totalLoss -= (log.productionTime - time)

        return {
          startTime: log.times[0].startTime,
          id: log.id,
          part: log.part.name,
          machine: log.timer.machine.name,
          time,
          operator: includeOperator ? log.operator : ""
        }
      })
    const totalPage = Math.ceil(logs.length / ITEMS_PER_PAGE)
    logs = paginate(logs, page, ITEMS_PER_PAGE)
    res.send({ 
      logs, 
      total: logs.length, 
      totalPage,
      totalTons,
      totalLoss: totalLoss / logs.length,
      totalGain: totalGain / logs.length
    })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

const getStartOfProductionTime = async (req, res) => {
  try {
    const log = await getStartProductionTime(req.query.city)
    res.send({ log })
  } catch (err) {
    console.log(err)
  }
}

module.exports = { 
  createMachine, 
  createPart, 
  createTimer, 
  getProducts, 
  editProduct, 
  deleteProduct, 
  startTimer, 
  endTimer, 
  stopTimer, 
  updateTimer, 
  getTimer, 
  searchMachines, 
  getTimerLogsOfMachine,
  getStartOfProductionTime,
  getLogsToPrint
}