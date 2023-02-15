const express = require("express")
const router = express.Router()
const multer = require('multer')

const { random } = require("../helpers/functions")

const machineStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './client/uploads/machines')
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, "machine-preview-"+Date.now()+random(10000, 99999)+"."+ext)
  }
})

const partStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './client/uploads/parts')
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split("/")[1];
    cb(null, "machine-preview-"+Date.now()+random(10000, 99999)+"."+ext)
  }
})

const uploadMachinePreview = multer({
  storage: machineStorage,
});

const uploadPartPreview = multer({
  storage: partStorage,
});

const { createMachine, createPart, getProducts } = require("../controllers/machine")
const { verifyToken } = require("../middleware/verifyToken")

router.post("/create-machine", [verifyToken, uploadMachinePreview.single("preview")], createMachine)
router.post("/create-part", [verifyToken, uploadPartPreview.single("preview")], createPart)
router.post("/get-products", verifyToken, getProducts)

module.exports = router