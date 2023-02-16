const { uploadPartPreview, uploadMachinePreview } = require('../config/multer')
const Machine = require('../models/Machine')
const Part = require('../models/Part')
const { getModel } = require('../helpers/functions')
const Timer = require('../models/Timer')

const createMachine = async (req, res) => {
  try {
    console.log(req.body)
    const machine = new Machine({
      ...req.body,
      preview: "/uploads/machines/"+req.file.filename
    })
    await machine.save()
    return res.send({machine})
  } catch (err) {
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
      ...req.body
    })
    await timer.save()
    const _timer = await Timer.findOne({ _id: timer._id }).populate("machine").populate("part").lean()
    res.send({ timer: {
      ..._timer,
      time: 0,
      totalTime: 0
    }})
  } catch(err) {
    res.sendStatus(500)
  }
}

const getProducts = async(req, res) => {
  try {
    const model = getModel(req.body.type)
    let products

    if (req.body.type == "Timer") {
      products = await Timer.find({}).sort({createdAt: -1}).populate("machine").populate("part").lean()
      let _products = []
      for (product of products) {
        let time = 0
        let totalTime = product.status == "Ended" ? parseInt((new Date(product.endTime).getTime() - new Date(product.startTime).getTime()) / 1000) : 0
        if (product.status == "Started") {
          time = parseInt((new Date().getTime() - new Date(product.startTime).getTime()) / 1000)
        }
        _products.push({
          ...product,
          time,
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
    timer.startTime = new Date()  
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
    timer.endTime = new Date()
    timer.status = "Ended"
    await timer.save()
    res.sendStatus(200)
  } catch(err) {
    res.sendStatus(500)
  }
}

const stopTimer = async (req, res) => {

}

module.exports = { createMachine, createPart, createTimer, getProducts, editProduct, deleteProduct, startTimer, endTimer }