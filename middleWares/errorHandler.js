const ServerError = require('../exceptions/serverError')
const { v4: uuidv4 } = require('uuid');

module.exports = function(err , req, res, next) {
  const errId = uuidv4()
  console.log(errId, err);
  if (err instanceof ServerError) {
    return res.status(err.status).json({message: err.message, errId, errors: err.errors})
  }
  return res.status(500).json({message: 'Unexpected error', errId})
}