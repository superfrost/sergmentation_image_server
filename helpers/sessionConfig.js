require('dotenv').config()
const session = require('express-session')
const sqlite = require('better-sqlite3')
const SqliteStore = require("better-sqlite3-session-store")(session)
const ses_db = new sqlite("./databases/sessions.db");

const sessionConfig = session({
  secret: process.env.SESSION_KEY,
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

module.exports = sessionConfig