module.exports = class ServerError extends Error {
  status;
  errors;

  constructor(status, message, errors = []) {
    super(message)
    this.status = status
    this.message = message
  }

  static UnauthorizedError() {
    return new ServerError(401, 'User not authorized')
  }

  static BadRequest(message, errors = []) {
    return new ServerError(400, message, errors)
  }

  static InternalError() {
    return new ServerError(500, 'Server side error')
  }

  static UserNotExistsError(message) {
    return new ServerError(406, message)
  }
}