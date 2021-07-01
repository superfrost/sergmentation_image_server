const fs = require('fs');
const {spawn} = require('child_process');
const express = require('express');
const PORT = 3000;
const multer = require('multer');
const { isArray } = require('util');
const db = require('better-sqlite3')('images.db', { verbose: console.log });

const pythonPath = './python_env/venv/Scripts/python.exe'
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

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.get('/results', (req, res) => {
  const rows = db.prepare(`SELECT * FROM images`).all();
  console.log(rows);
  res.render('results', {data: {rows}})
})

app.get('/result/:id', (req, res) => {
  if (!req.params.id) {
    console.log("No ID")
    res.send('Error. No ID')
    return
  }
  console.log(`Reques param id: ${req.params.id}`)
  const rawImage = db.prepare(`SELECT * FROM images WHERE id = ?`).get(req.params.id);
  const processedImages = db.prepare(`SELECT * FROM images AS i JOIN result AS r ON i.id = r.image_id AND i.id = ?`).all(req.params.id);
  console.log(rawImage, processedImages);
  res.render('result', {data: {rawImage, processedImages}})
})

app.get('/del/:id', (req, res) => {

  let prevId = req.query?.prevId?.toString();
  let id = req.params?.id?.toString()

  if (!id) {
    console.log('Error no parameter in request');
    res.send('Error no parameter in request')
    return 
  }

  const row = db.prepare(`SELECT * FROM result WHERE id = ?`).get(id)
  console.log(row);
  let fileName = row?.file_name.toString()
  deleteFileFromResults(fileName)
  deleteFromResultDBbyId(id)

  if (!prevId) res.redirect('/')
  res.redirect(`/result/${prevId}`)
})

app.get('/del_main/:id', (req, res) => {

  let id = req.params?.id?.toString()
  if (!id) {
    console.log('Error no parameter in request');
    res.send('Error no parameter in request')
    return 
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
  deleteFromImagesDBbyId(id);

  res.redirect(`/results`)
})

app.get('/add_segment', (req, res) => {

  let sizeOfSegment = req.query.segmentSize
  let updatingImageId = req.query.rawImageId
  let imageFileName = req.query.rawImageName

  if (!sizeOfSegment || !updatingImageId || !imageFileName) {
    console.log(`Error. add_segment some of parameters are missed`);
    return res.send(`Error some of parameters are missed`);
  }

  if (sizeOfSegment && updatingImageId && imageFileName) {
    segmetateImageByPythonScript(pythonPath, pythonExecScript, imageFileName, sizeOfSegment, updatingImageId)
  }

  res.redirect(`/result/${updatingImageId}`)
})

app.post('/segment', upload.single('image'), function (req, res) {

  if (!req.file) {
    res.send('Error. No file attached!')
    return
  }
  console.log(req.file);
  console.log('Segment size:' + req.body?.segmentSize);

  let fileName = req.file.filename
  let sizeOfSegment = req.body?.segmentSize ?? "8"

  if (req.file && req.file.filename) { 
    const info = db.prepare(`INSERT OR IGNORE INTO images(file_name, date) VALUES(?, datetime('now'))`).run(req.file.filename);
    console.log(info);
    insertedImageId = info?.lastInsertRowid?.toString()

    segmetateImageByPythonScript(pythonPath, pythonExecScript, fileName, sizeOfSegment, insertedImageId, 1)
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

function segmetateImageByPythonScript(pythonEnvPath, executablePythonScript, imageFileName, sizeOfSegment, insertedImageId, createThumb = 0) {
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