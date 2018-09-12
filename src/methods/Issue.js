const Endpoints = require('../Endpoints')

class IssueMethods {
  constructor (requestHandler) {
    this.requestHandler = requestHandler
  }

  find (data) {
    return this.requestHandler.request(Endpoints.ISSUE(data.id), 'get', 'json', data)
  }
}

module.exports = IssueMethods
