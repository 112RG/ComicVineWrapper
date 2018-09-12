const Endpoints = require('../Endpoints')

class VolumeMethods {
  constructor (requestHandler) {
    this.requestHandler = requestHandler
  }

  find (data) {
    return this.requestHandler.request(Endpoints.VOLUME(data.id), 'get', 'json', data)
  }
}

module.exports = VolumeMethods
