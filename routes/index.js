const express = require('express')
const router = express.Router()
const isAuth = require('../middleWares/isAuth')
const mainController = require('../controllers/index')

const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images')
  },
  filename: function (req, file, cb) {
    if (file.mimetype === 'image/jpeg') {
      cb(null, file.fieldname + '-' + Date.now() + '.jpg')
      return
    }
    if (file.mimetype === 'image/png') {
      cb(null, file.fieldname + '-' + Date.now() + '.png')
      return
    }
    console.log('Not allowed file type' +  Date.now())
    console.log(file);
  }
})
const upload = multer({ storage: storage })

router.get("/login", mainController.login)

router.get("/register", mainController.getRegister)

router.post("/register", mainController.postRegister)

router.get("/register_success", mainController.getRegisterSuccess)

router.get("/forgot_pass", mainController.getForgotPassword)

router.post("/forgot_pass", mainController.postForgotPassword)

router.get("/reset_pass/:token", mainController.resetPassword)

router.post('/auth', mainController.auth)

router.use(isAuth);

router.get("/", mainController.home)

router.get("/logout", mainController.logout)

router.get("/profile/:id", mainController.getProfile)

router.post("/profile/:id", mainController.postProfile)

router.get("/add_file", mainController.getAddFile)

router.get("/favorites/:id", mainController.getFavoritesById)

router.get("/unfavorite/:id", mainController.unFavoriteImageById)

router.get("/favorites", mainController.getFavorites)

router.get('/results', mainController.getResults)

router.get('/result/:id', mainController.getResultById)

router.get('/del/:id', mainController.deleteById)

router.get('/del_main/:id', mainController.deleteMain)

router.get('/add_segment', mainController.addSegment)

router.post('/segment', upload.single('image'), mainController.uploadAndSegmentateImage)

module.exports = router