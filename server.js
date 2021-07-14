const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const express = require('express');
const PORT = 3000;
const multer = require('multer');
const db = require('better-sqlite3')('images.db', { verbose: console.log });
const helmet = require("helmet");
const bcrypt = require('bcrypt');

const session = require('express-session')
const sqlite = require('better-sqlite3')
const SqliteStore = require("better-sqlite3-session-store")(session)
const ses_db = new sqlite("sessions.db", { verbose: console.log });


// Windows
const pythonPath = './python_env/venv/Scripts/python.exe'
// Linux
// const pythonPath = './python_env/venv/bin/python'

const pythonExecScript = './python_env/segmentation.py'

initDirs();
initDB();

const app = express();
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

app.use(helmet());
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

app.use(
  session({
    secret: "as.,ngpobdsopxcfet4579fgpbnks!*!&^@*@sdjbnvsdk",
    resave: false,
    saveUninitialized: false,
    store: new SqliteStore({
      client: ses_db, 
      expired: {
        clear: true,
        intervalMs: 900000 //ms = 15min
      }
    }),
  })
)

app.get("/login", (req, res) => {
  res.render("login")
})

app.post('/auth', async (req, res) => {
  const login = req.body?.login
  const password = req.body?.password
  if(!login || !password) {
    console.log("No login or password");
    return res.status(500).send("No login or password")
  }
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(login)
  if(!row || !row.password) {
    console.log("Wrong or No username");
    return res.status(401).send("Wrong username or password!")
  }
  let hashFromDB = row.password
  const result = await bcrypt.compare(password, hashFromDB)
  if(!result) {
    console.log("Wrong password");
    return res.status(401).send("Wrong username or password")
  }
  req.session.isAuth = true;
  req.session.userId = row.id;
  req.session.user_role = row.role;
  req.session.userName = row.username
  res.redirect("/results")
})

app.use(function isAuth(req, res, next) {
  if(req.session.isAuth) {
    next()
  } else {
    res.redirect("/login")
  }
});

app.get("/", (req, res) => {
  res.redirect("/results")
})

app.get("/add_file", (req, res) => {
  user = {
    id:   req.session.userId,
    role: req.session.user_role,
    userName: req.session.userName,
  }
  res.render("add_file", {data: {user}})
})

app.get("/favorites", (req, res) => {
  const userId = req.session.userId.toString()
  user = {
    id:   req.session.userId,
    role: req.session.user_role,
    userName: req.session.userName,
  }
  const rows = db.prepare(`SELECT * FROM favorite JOIN images ON favorite.image_id = images.id AND user_id = ?`).all(userId)
  res.render("favorites", {data: {rows, user},})
})

app.get("/favorites/:id", (req, res) => {
  const imageId = req.params.id
  const userId = req.session.userId
  const result = getFavoriteFromDb(imageId, userId)
  if(!result) {
    addToFavoritesDbByImageId(imageId, userId)
  }
  res.redirect('/results')
})

app.get("/unfavorite/:id", (req, res) => {
  const imageId = req.params.id
  const userId = req.session.userId
  unfavoriteImageFromDbByImageId(imageId, userId)
  res.redirect('/favorites')
})

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if(err) {
      console.log("Trouble with logout", err);
      res.send("Some error")
      return
    }
    res.redirect('/login')
  });
})


app.get('/results', (req, res) => {
  const count = db.prepare(`SELECT COUNT(*) FROM images`).get();
  const numberOfImages = count['COUNT(*)']
  const currentPage = req.query.page_number || 1 
  const limit = req.query.limit || 10
  const numOfPages = Math.ceil(numberOfImages / limit)
  const offset = limit * currentPage - limit

  // const limit = 4;
  // const offset = 0;
  const rows = db.prepare(`SELECT * FROM images LIMIT ? OFFSET ?`).all(limit, offset);
  user = {
    id:   req.session.userId,
    role: req.session.user_role,
    userName: req.session.userName,
  }
  pages = {
    currentPage,
    numOfPages,
    limit,
  }
  res.render('results', {data: {rows, user, pages}})
})

app.get('/result/:id', (req, res) => {
  if (!req.params.id) {
    console.log("No ID")
    res.send('Error. No ID')
    return
  }
  console.log(`Request param id: ${req.params.id}`)
  const rawImage = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id);
  const processedImages = db.prepare(`SELECT * FROM images AS i JOIN result AS r ON i.id = r.image_id AND i.id = ?`).all(req.params.id);
  user = {
    id:   req.session.userId,
    role: req.session.user_role,
    userName: req.session.userName,
  }
  res.render('result', {data: {rawImage, processedImages, user}})
})

app.get('/del/:id', (req, res) => {

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

  const row = db.prepare(`SELECT * FROM result WHERE id = ?`).get(id)
  let fileName = row?.file_name.toString()
  deleteFileFromResults(fileName)
  deleteFromResultDBbyId(id)

  if (!prevId) res.redirect('/')
  res.redirect(`/result/${prevId}`)
})

app.get('/del_main/:id', (req, res) => {
  const user_role = req.session.user_role;
  let id = req.params?.id?.toString()
  if (!id) {
    console.log('Error no parameter in request');
    res.send('Error no parameter in request')
    return 
  }

  if(!user_role) {
    console.log('User not admin and can not delete anything');
    return res.send('You are not admin')
  }

  const row = db.prepare(`SELECT * FROM images WHERE id = ?`).get(id)
  let fileName = row?.file_name.toString()
  let rawImageId = row?.id.toString()
  const rows = db.prepare('SELECT * FROM result WHERE image_id = ?').all(id)
  // First delete results image then delete main image
  rows.forEach(row => {
    deleteFileFromResults(row.file_name);
    deleteFromResultDBbyId(row.id);
  })
  deleteFileFromMain(fileName);
  deleteFromFavoritesDBbyId(id)
  deleteFromImagesDBbyId(id);

  res.redirect(`/results`)
})

app.get('/add_segment', (req, res) => {

  let sizeOfSegment = req.query.segmentSize
  let updatingImageId = req.query.rawImageId
  let imageFileName = req.query.rawImageName

  const fileNameBeingInserted = 'result-' + updatingImageId + '-' + sizeOfSegment + '.jpg'
  const isImageInDb = db.prepare("SELECT * FROM result WHERE file_name = ?").get(fileNameBeingInserted)

  if (!sizeOfSegment || !updatingImageId || !imageFileName) {
    console.log(`Error. add_segment some parameters are missed`);
    return res.send(`Error some parameters are missed`);
  }

  if (sizeOfSegment && updatingImageId && imageFileName && !isImageInDb) {
    segmentateImageByPythonScript(pythonPath, pythonExecScript, imageFileName, sizeOfSegment, updatingImageId)
  }

  res.redirect(`/result/${updatingImageId}`)
})

app.post('/segment', upload.single('image'), function (req, res) {

  if (!req.file) {
    res.send('Error. No file attached!')
    return
  }

  let fileName = req.file.filename
  let sizeOfSegment = req.body?.segmentSize ?? "8"

  if (req.file && req.file.filename) { 
    const info = db.prepare(`INSERT INTO images(file_name, date) VALUES(?, datetime('now'))`).run(req.file.filename);
    insertedImageId = info?.lastInsertRowid?.toString()

    segmentateImageByPythonScript(pythonPath, pythonExecScript, fileName, sizeOfSegment, insertedImageId, 1)
  }
  res.redirect('/')
})

app.listen(PORT, () => {
  console.log(`Sever started at http://localhost:${PORT}`);
})

function initDB() {
  const initialSql = fs.readFileSync('./init.sql', 'utf8');
  db.exec(initialSql);
}

function initDirs() {
  fs.mkdir('./public/images/result', { recursive: true }, (err) => {
    if (err) console.log(err);
  });
  fs.mkdir('./public/images/mini/result', { recursive: true }, (err) => {
    if (err) console.log(err);
  });
}

function segmentateImageByPythonScript(pythonEnvPath, executablePythonScript, imageFileName, sizeOfSegment, insertedImageId, createThumb = 0) {
  let resultFileName = ''
  const python = spawn(pythonEnvPath, [executablePythonScript, imageFileName, sizeOfSegment, insertedImageId, createThumb]);
  python.stdout.on('data', function (data) {
    resultFileName = data.toString();
    console.log('Result file name: ', resultFileName);
  });

  python.on('close', (code) => {
    if (code) return console.log(`Python script closed with error. Code: ${code}`);
    
    console.log(`Python script close with code ${code}`);
    const info = db.prepare(`INSERT OR IGNORE INTO result(image_id, options, file_name, date) VALUES(?, ?, ?, datetime('now'))`)
                            .run(insertedImageId, sizeOfSegment, resultFileName);
    console.log(info);
  });
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

function deleteFromResultDBbyId(id) {
  const info = db.prepare('DELETE FROM result WHERE id = ?').run(id)
  console.log(info);
  return info
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

function deleteFromImagesDBbyId(id) {
  const info = db.prepare('DELETE FROM images WHERE id = ?').run(id)
  console.log(info);
  return info
}

function deleteFromFavoritesDBbyId(image_id) {
  const info = db.prepare('DELETE FROM favorite WHERE image_id = ?').run(image_id)
  console.log(info);
  return info
}

function addToFavoritesDbByImageId(image_id, user_id) {
  const info = db.prepare("INSERT INTO favorite (image_id, user_id) VALUES (?, ?)").run(image_id, user_id)
  console.log(info);
  return info
}

function unfavoriteImageFromDbByImageId(image_id, user_id) {
  const info = db.prepare("DELETE FROM favorite WHERE image_id = ? AND user_id = ?").run(image_id, user_id)
  console.log(info);
  return info
}

function getFavoriteFromDb(image_Id, user_Id) {
  const result = db.prepare("SELECT * FROM favorite WHERE image_id = ? AND user_id = ?").get(image_Id, user_Id)
  return result
}

function isAuth(req, res, next) {
  if(req?.session?.isAuth) {
    next()
  } else {
    res.redirect("/")
  }
}