const fs = require('fs')
const { spawnSync } = require('child_process');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const mailService = require('../service/mailService')

const { pythonVenvPath, pythonSegmentationScript } = require('../helpers/pythonPaths');
const db = require('../models/db');
const ServerError = require('../exceptions/serverError');
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS)

class MainController {

  login(req, res, next) {
    try {
      res.render("login")
    } catch (err) {
      next(err)
    }
  }

  getRegister(req, res, next) {
    try {
      res.render("register")
    } catch (err) {
      next(err)
    }
  }

  async postRegister(req, res, next) {
    try {
      const { email, nick, password } = req.body
      const isUserInDb = db.findUser(email)
      if(isUserInDb) {
        throw ServerError.BadRequest("User already exist")
      }
      const hashPassword = await bcrypt.hash(password, SALT_ROUNDS)
      const resultInfo = db.addUser(email, nick, hashPassword)
      if(resultInfo.changes) {
        return res.redirect("register_success")
      }
      throw ServerError.InternalError()
    } catch (err) {
      next(err)
    }
  }

  getRegisterSuccess(req, res, next) {
    try {
      res.render("register_success")
    } catch (err) {
      next(err)
    }
  }

  getForgotPassword(req, res, next) {
    try {
      res.render("forgot_pass")
    } catch (err) {
      next(err)
    }
  }

  postForgotPassword(req, res, next) {
    try {
      const { email } = req.body
      const isUserInDb = db.findUser(email)
      if(isUserInDb) {
        const resetLink = createResetEmailLink(email)
        mailService.sendResetPasswordMail(email, resetLink)
        //TODO Implement redirect to page check email
        return res.status(200).send('Redirect to page check email')
      }
      throw ServerError.UserNotExistsError("User don't exist")
    } catch (err) {
      next(err)
    }
  }

  resetPassword(req, res, next) {
    try {
      //TODO IMplement verification in db
      //TODO Implement redirect to reset_pass page
      console.log('Try to reset pass');
      const token = req.params.token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(decoded);
      res.status(200).send('Redirect to reset_pass page')
    } catch (err) {
      next(err)
    }
  }

  getProfile(req, res, next) {
    try {
      const userInfo = db.findUser(req.session.userName)
      if(!userInfo) {
        throw ServerError.BadRequest
      }
      const bot_address = process.env.TELEGRAM_BOT_ADDRESS
      const user = createUserObj(req)
      res.render("profile", {data: {user, bot_address}})
    } catch (err) {
      next(err)
    }
  }

  postProfile(req, res, next) {
    try {
      const {nick, telegramId} = req.body
      if(!nick) {
        ServerError.BadRequest("Can't update profile. No nick")
      }
      const { userName } = req.session
      const info = db.updateUser(userName, nick, telegramId)
      if(info.changes) {
        const user = db.findUser(req.session.userName)
        updateUserSessionData(user, req)
        return res.redirect(`/profile/${req.session.userId}`)
      }
      throw new Error("Can't update user")
    } catch (err) {
      next(err)
    }
  }

  async auth(req, res, next) {
    try {
      const login = req.body?.login
      const password = req.body?.password
      if(!login || !password) {
        console.log("No login or password");
        return res.status(500).send("No login or password")
      }
      const user = db.findUser(login)

      if(!user || !user.password) {
        console.log("Wrong or No username");
        return res.status(401).send("Wrong username or password!")
      }
      let hashFromDB = user.password
      const result = await bcrypt.compare(password, hashFromDB)
      if(!result) {
        console.log("Wrong password");
        return res.status(401).send("Wrong username or password")
      }
      req.session.isAuth = true;
      updateUserSessionData(user, req)
      res.redirect("/results")
    } catch (err) {
      next(err)
    }
  }

  home(req, res, next) {
    try {
      res.redirect("/results")
    } catch (err) {
      next(err)
    }
  }

  getAddFile(req, res, next) {
    try {
      const user = createUserObj(req)
      res.render("add_file", {data: {user}})
    } catch (err) {
      next(err)
    }
  }

  getFavoritesById(req, res, next) {
    try {
      const imageId = req.params.id
      const userId = req.session.userId
      const favoriteImage = db.getFavoriteImage(imageId, userId)
      if(!favoriteImage) {
        db.addToFavoritesImage(imageId, userId)
      }

      if(!req.session.location) return res.redirect('/results')
      res.redirect(req.session.location)
    } catch (err) {
      next(err)
    }
  }

  unFavoriteImageById(req, res, next) {
    try {
      const imageId = req.params.id
      const userId = req.session.userId
      db.unfavoriteImageById(imageId, userId)

      if(!req.session.location) return res.redirect('/favorites')
      res.redirect(req.session.location)
    } catch (err) {
      next(err)
    }
  }

  logout(req, res, next) {
    try {
      req.session.destroy(err => {
        if(err) {
          return next(err)
        }
        res.redirect('/login')
      });
    } catch (err) {
      next(err)
    }
  }

  getFavorites(req, res, next) {
    try {
      const userId = req.session.userId.toString()
      req.session.location = "/favorites"
      const user = createUserObj(req)
      const favoriteImages = db.getFavorites(userId)
      res.render("favorites", {data: {favoriteImages, user},})
    } catch (err) {
      next(err)
    }
  }

  getResults(req, res, next) {
    try {
      req.session.location = "/results"
      const numberOfImages = db.countImages()
      const currentPage = req.query.page_number || 1 
      const limit = req.query.limit || 10
      const numOfPages = Math.ceil(numberOfImages / limit)
      const offset = limit * currentPage - limit

      const rows = db.getImagesAndFavorites(req.session.userId, limit, offset);
      const user = createUserObj(req)
      const pages = {
        currentPage,
        numOfPages,
        limit,
      }
      res.render('results', {data: {rows, user, pages}})
    } catch (err) {
      next(err)
    }
  }

  getResultById(req, res, next) {
    try {
      if (!req.params.id) {
        console.log("No ID")
        res.send('Error. No ID')
        return
      }
      req.session.location = `/result/${req.params.id}`
      const rawImage = db.getImageById(req.params.id);
      if (!rawImage) {
        console.log("No image with this ID")
        return res.redirect('/results')
      }
      const isFavorite = db.isRawImageFavoriteByUser(req.params.id, req.session.userId)
      rawImage.user_id = isFavorite
      const processedImages = db.getResultsByRawImageIdWidthSegmentationInfo(req.params.id);
      const user = createUserObj(req)
      res.render('result', {data: {rawImage, processedImages, user}})
    } catch (err) {
      next(err)
    }
  }

  deleteById(req, res, next) {
    try {
      let prevId = req.query?.prevId?.toString();
      let id = req.params?.id?.toString()
      const user_role = req.session.user_role;
    
      if (!id) {
        console.log('Error no parameter in request');
        res.send('Error no parameter in request')
        return 
      }
      if(!user_role) {
        console.log('User not admin and can not delete anything');
        return res.send('You are not admin')
      }
    
      const resultImage = db.getResultImageById(id)
      let fileName = resultImage?.file_name.toString()
      deleteFileFromResults(fileName)
      db.deleteResultImageById(id)
    
      if (!prevId) res.redirect('/')
      res.redirect(`/result/${prevId}`)
    } catch (err) {
      next(err)
    }
  }

  deleteMain(req, res, next) {
    try {
      let id = req.params?.id?.toString()
      const user_role = req.session.user_role;
      if (!id) {
        console.log('Error no parameter in request');
        res.send('Error no parameter in request')
        return 
      }
    
      if(!user_role) {
        console.log('User not admin and can not delete anything');
        return res.send('You are not admin')
      }
    
      const rawImage = db.getImageById(id)
      let fileName = rawImage?.file_name.toString()
      const resultImages = db.getResultsByRawImageId(id)
      // First delete results images then delete main image
      resultImages.forEach(image => {
        deleteFileFromResults(image.file_name);
        db.deleteResultImageById(image.id)
      })
      deleteFileFromMain(fileName);
      db.deleteFavoriteImageById(id)
      db.deleteRawImageById(id);
    
      if(!req.session.location) return res.redirect(`/results`)
      res.redirect(req.session.location)  
    } catch (err) {
      next(err)
    }
  }

  addSegment(req, res, next) {
    try {
      let sizeOfSegment = req.query.segmentSize
      let updatingImageId = req.query.rawImageId
      let imageFileName = req.query.rawImageName

      const fileNameBeingInserted = 'result-' + updatingImageId + '-' + sizeOfSegment + '.jpg'
      const isImageInDb = db.isResultImageInDb(fileNameBeingInserted)

      if (!sizeOfSegment || !updatingImageId || !imageFileName) {
        console.log(`Error. add_segment some parameters are missed`);
        return res.send(`Error some parameters are missed`);
      }

      if (sizeOfSegment && updatingImageId && imageFileName && !isImageInDb) {
        segmentateImageByPythonScript(pythonVenvPath, pythonSegmentationScript, imageFileName, sizeOfSegment, updatingImageId)
      }

      res.redirect(`/result/${updatingImageId}`)
    } catch (err) {
      next(err)
    }
  }

  uploadAndSegmentateImage(req, res, next) {
    try {
      if (!req.file) {
        res.send('Error. No file attached!')
        return
      }

      let fileName = req.file.filename
      let sizeOfSegment = req.body?.segmentSize ?? "8"
      console.log(fileName, sizeOfSegment);
      if (req.file && req.file.filename) { 
        const info = db.addRawImage(req.file.filename);
        console.log("INFO ", info);
        const insertedImageId = info?.lastInsertRowid?.toString()

        segmentateImageByPythonScript(pythonVenvPath, pythonSegmentationScript, fileName, sizeOfSegment, insertedImageId, 1)
      }
      res.redirect('/')
    } catch (err) {
      next(err)
    }
  }
}

module.exports = new MainController()

function segmentateImageByPythonScript(pythonEnvPath, executablePythonScript, imageFileName, sizeOfSegment, insertedImageId, createThumb = 0) {
  let resultFileName = ''

  const python = spawnSync(pythonEnvPath, [executablePythonScript, imageFileName, sizeOfSegment, insertedImageId, createThumb]);
  if(python.status) {
    console.log("Error: " , python.stderr.toString());
    return
  }
  resultFileName = python.stdout.toString()
  const info = db.insertResultImageInD(insertedImageId, sizeOfSegment, resultFileName);
  console.log(info);
  return resultFileName
}

function deleteFileFromResults(fileName) {
  console.log('Prepare for deleting file: ', fileName);
  let resultDir = "./public/images/result/"
  console.log(resultDir + fileName);
  // delete large file
  fs.unlink(resultDir + fileName, (err) => {
    if (err) return console.log(`Error can't delete file ${fileName} from ${resultDir}`);
    console.log(`File: ${fileName} - is deleted.`);
  });
  // delete mini file
  let resultDirMini = "./public/images/mini/result/"
  console.log(resultDirMini + fileName);
  fs.unlink(resultDirMini + fileName, (err) => {
    if (err) return console.log(`Error can't delete mini file ${fileName} from ${resultDirMini}`);
    console.log(`Mini file: ${fileName} - is deleted.`);
  });
}

function deleteFileFromMain(fileName) {
  console.log(fileName);
  let resultDir = "./public/images/"
  console.log(resultDir + fileName);
  
  fs.unlink(resultDir + fileName, (err) => {
    if (err) return console.log(`Error can't delete file ${fileName} from ${resultDir}`);
    console.log(`File: ${fileName} - is deleted.`);
  });

  let resultDirMini = "./public/images/mini/"
  fs.unlink(resultDirMini + fileName, (err) => {
    if (err) return console.log(`Error can't delete mini file ${fileName} from ${resultDirMini}`);
    console.log(`Mini file: ${fileName} - is deleted.`);
  });
}

function createUserObj(req) {
  return {
    id: req.session.userId,
    role: req.session.user_role,
    userName: req.session.userName,
    userNickName: req.session.userNickName,
    userTelegramID: req.session.userTelegramId,
  };
}

function updateUserSessionData(userObj, req) {
  req.session.userId = userObj.id;
  req.session.user_role = userObj.role;
  req.session.userName = userObj.username
  req.session.userNickName = userObj.nick_name
  req.session.userTelegramId = userObj.telegram_id
}

function createResetEmailLink(email) {
  const token = jwt.sign({
    data: email
  }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const resetLink = `${process.env.SERVER_HOST}/reset_pass/${token}`
  return resetLink
}