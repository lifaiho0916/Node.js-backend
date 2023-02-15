const { uploadPartPreview, uploadMachinePreview } = require('../config/multer')
const Machine = require('../models/Machine')
const Part = require('../models/Part')

const createMachine = async (req, res) => {
  try {
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
    console.log(req.file)
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

const getProducts = async(req, res) => {
  try {
    let model = Machine
    if (req.body.type == "Part") model = Part
    const products = await model.find({})
    res.send({ products })
  } catch (err) {
    console.log(err)
    res.sendStatus(500)
  }
}

module.exports = { createMachine, createPart, getProducts }