const path = require('path')
const db = require('better-sqlite3')('./databases/images.db', { verbose: console.log });
const fs = require('fs')

initDB()

function initDB() {
  const initialSql = fs.readFileSync(path.join(__dirname, '..', 'databases', 'init.sql'), 'utf8');
  db.exec(initialSql);
}

class SqliteDb {

  findUser(email) {
    const result = db.prepare("SELECT * FROM users WHERE username = ?").get(email)
    return result
  }

  addUser(email, nickName, password) {
    const info = db.prepare("INSERT INTO users (username, nick_name, password, role) VALUES(?, ?, ?, 0)").run(email, nickName, password)
    return info
  }

  updateUser(email, nickName, telegramId) {
    const info = db.prepare("UPDATE users SET nick_name=?, telegram_id=? WHERE username = ?").run(nickName, telegramId, email)
    return info
  }

  getImageById(id) {
    const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(id)
    return image
  }

  getImagesAndFavorites(userId, limit, offset) {
    const rows = db.prepare(`SELECT images.*, favorite.user_id FROM images LEFT JOIN favorite ON favorite.image_id = images.id AND favorite.user_id = ? LIMIT ? OFFSET ?`).all(userId, limit, offset);
    return rows
  }

  addRawImage(filename) {
    const info = db.prepare(`INSERT INTO images(file_name, date) VALUES(?, datetime('now', 'localtime'))`).run(filename);
    return info
  }

  deleteRawImageById(rawImageId) {
    const info = db.prepare('DELETE FROM images WHERE id = ?').run(rawImageId)
    return info
  }

  getResultsByRawImageId(rawImageId) {
    const resultImages = db.prepare('SELECT * FROM result WHERE image_id = ?').all(rawImageId)
    return resultImages
  }

  getResultsByRawImageIdWidthSegmentationInfo(rawImageId) {
    const processedImages = db.prepare(`SELECT * FROM images AS i JOIN result AS r ON i.id = r.image_id AND i.id = ?`).all(rawImageId);
    return processedImages
  }

  isResultImageInDb(resultImageFileName) {
    const isResultImageInDb = db.prepare("SELECT * FROM result WHERE file_name = ?").get(resultImageFileName)
    return isResultImageInDb
  }

  insertResultImageInD(insertedImageId, sizeOfSegment, resultFileName) {
    const info = db.prepare(`INSERT INTO result(image_id, options, file_name, date) VALUES(?, ?, ?, datetime('now', 'localtime'))`).run(insertedImageId, sizeOfSegment, resultFileName);
    return info
  }

  isRawImageFavoriteByUser(imageId, userId) {
    const isFavorite = db.prepare("SELECT user_id FROM favorite WHERE image_id = ? AND user_id = ?").get(imageId, userId)
    return isFavorite
  }

  deleteResultImageById(resultImageId) {
    const info = db.prepare('DELETE FROM result WHERE id = ?').run(resultImageId)
    return info
  }

  getFavorites(userId) {
    const favoritesImages = db.prepare(`SELECT * FROM favorite JOIN images ON favorite.image_id = images.id AND user_id = ?`).all(userId)
    return favoritesImages
  }

  getFavoriteImage(imageId, userId) {
    const favoriteImage = db.prepare("SELECT * FROM favorite WHERE image_id = ? AND user_id = ?").get(imageId, userId)
    return favoriteImage
  }

  addToFavoritesImage(imageId, userId) {
    const info = db.prepare("INSERT INTO favorite (image_id, user_id) VALUES (?, ?)").run(imageId, userId)
    return info
  }

  unfavoriteImageById(imageId, userId) {
    const info = db.prepare("DELETE FROM favorite WHERE image_id = ? AND user_id = ?").run(imageId, userId)
    return info
  }

  deleteFavoriteImageById(imageId) {
    const info = db.prepare('DELETE FROM favorite WHERE image_id = ?').run(imageId)
    return info
  }

  countImages() {
    const count = db.prepare(`SELECT COUNT(*) FROM images`).get();
    const numberOfImages = count['COUNT(*)']
    return numberOfImages
  }

  getResultImageById(resultImageId) {
    const resultImage = db.prepare(`SELECT * FROM result WHERE id = ?`).get(resultImageId)
    return resultImage
  }
}

module.exports = new SqliteDb()