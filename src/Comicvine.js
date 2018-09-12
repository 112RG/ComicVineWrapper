const Endpoints = require('./Endpoints.js')
let RequestHandler = require('./RequestHandler')
let SearchMethods = require('./methods/Search')
let IssueMethods = require('./methods/Issue')
let VolumeMethods = require('./methods/Volume')
let Ratelimiter = require('./Ratelimiter')

class ComicVine {
  constructor (token, options) {
    if (!token || token === '') {
      throw Error('Missing API token')
    }
    this.token = token
    if (options) {
      Object.assign(this.options, options)
    }
    this.ratelimiter = new Ratelimiter()
    this.requestHandler = new RequestHandler(this.ratelimiter, {
      token: this.token,
      baseHost: Endpoints.BASE_HOST
    })

    this.search = new SearchMethods(this.requestHandler)
    this.issue = new IssueMethods(this.requestHandler)
    this.volume = new VolumeMethods(this.requestHandler)
  }
}

module.exports = ComicVine
