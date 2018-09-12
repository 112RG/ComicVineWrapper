const Endpoints = require('../Endpoints')

class SearchMethods {
  constructor (requestHandler) {
    this.requestHandler = requestHandler
  }

  searchComic (data) {
    return this.requestHandler.request(Endpoints.SEARCH(data.query), 'get', 'json', data)
  }
}

module.exports = SearchMethods
