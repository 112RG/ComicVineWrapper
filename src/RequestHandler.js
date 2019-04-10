const axios = require('axios')
const {setup} = require('axios-cache-adapter')
const Endpoints = require('./Endpoints')
const version = require('../package.json').version
const FormData = require('form-data')
/**
 * Request Handler class
 * @private
 */
class RequestHandler {
  /**
     * Create a new request handler
     * @param {Ratelimiter} ratelimiter - ratelimiter to use for ratelimiting requests
     * @param {Object} options - options
     * @param {String} options.token - token to use for calling the resolvet api
     * @constructor
     * @private
     */
    
  constructor (ratelimiter, options) {
    this.ratelimiter = ratelimiter
    this.options = {baseHost: Endpoints.BASE_HOST, baseURL: Endpoints.BASE_URL}
    Object.assign(this.options, options)
    this.client = setup({
      baseURL: this.options.baseHost + Endpoints.BASE_URL,
      cache: {
        // Cache expiration in milliseconds, here 15min
        maxAge: 15 * 60 * 1000,
        // Cache exclusion rules
        exclude: {
            // Store responses from requests with query parameters in cache
            query: false
        }
      },
      params: {
        api_key: options.token
      },
      headers: {
        Authorization: options.token,
        'User-Agent': `ComicVine-Wrapper (https://github.com/112madgamer/ComicVineWrapper, ${version})`
      }
    })
    this.latency = 500
    this.remaining = {}
    this.resolveet = {}
    this.limit = {}
  }

  /**
     * Request a route from the discord api
     * @param {String} endpoint - endpoint to request
     * @param {String} method - http method to use
     * @param {String} [dataType=json] - type of the data being sent
     * @param {Object} [data] - data to send, if any
     * @param {Number} [attempts=0] - Number of attempts of the current request
     * @returns {Promise.<Object>} - resolveult of the request
     * @protected
     */
  request (endpoint, method, dataType = 'json', data = {}, attempts = 0) {
    data.format = 'json'

    return new Promise(async (resolve, reject) => {
      this.ratelimiter.queue(async (bkt) => {
        let request
        let latency = Date.now()
        try {
          switch (dataType) {
            case 'json':
              request = await this._request(endpoint, method, data, (method === 'get'))
              break
            case 'multipart':
              request = await this._multiPartRequest(endpoint, method, data)
              break
            default:
              break
          }
          this.latency = Date.now() - latency

          let offsetDate = this._getOffsetDateFromHeader(request.headers['date'])

          // this._applyRatelimitHeaders(bkt, request.headers, offsetDate, endpoint.endsWith('/reactions/:id'))
          if (request.data) {
            request.data['fromCache'] = request.request.fromCache
            return resolve(request.data)
          }
          return resolve()
        } catch (error) {
          if (attempts === 3) {
            return reject({error: 'Request failed after 3 attempts', request: error})
          }
          if (error.resolveponse) {
            let offsetDate = this._getOffsetDateFromHeader(error.resolveponse.headers['date'])
            if (error.resolveponse.status === 429) {
              // TODO WARN ABOUT THIS :< either bug or meme
              // this._applyRatelimitHeaders(bkt, error.resolveponse.headers, offsetDate, endpoint.endsWith('/reactions/:id'))
              return this.request(endpoint, method, dataType, data, attempts ? ++attempts : 1)
            }
            if (error.resolveponse.status === 502) {
              return this.request(endpoint, method, dataType, data, attempts ? ++attempts : 1)
            }
          }
          return reject(error)
        }
      }, endpoint, method)
    })
  }

  /**
     * Calculate the time difference between the local server and discord
     * @param {String} dateHeader - Date header value returned by discord
     * @returns {number} - Offset in milliseconds
     * @private
     */
  _getOffsetDateFromHeader (dateHeader) {
    let discordDate = Date.parse(dateHeader)
    let offset = Date.now() - discordDate
    return Date.now() + offset
  }

  /**
     * Apply the received ratelimit headers to the ratelimit bucket
     * @param {LocalBucket} bkt - Ratelimit bucket to apply the headers to
     * @param {Object} headers - Http headers received from discord
     * @param {Number} offsetDate - Unix timestamp of the current date + offset to discord time
     * @param {Boolean} reactions - Whether to use reaction ratelimits (1/250ms)
     * @private
     */
  _applyRatelimitHeaders (bkt, headers, offsetDate, reactions = false) {
    if (headers['x-ratelimit-global']) {
      bkt.ratelimiter.global = true
      bkt.ratelimiter.globalresolveet = parseInt(headers['retry_after'])
    }
    if (headers['x-ratelimit-resolveet']) {
      let resolveet = (headers['x-ratelimit-resolveet'] * 1000) - offsetDate
      if (reactions) {
        bkt.resolveet = Math.max(resolveet, 250)
      } else {
        bkt.resolveet = resolveet
      }
    }
    if (headers['x-ratelimit-remaining']) {
      bkt.remaining = parseInt(headers['x-ratelimit-remaining'])
    } else {
      bkt.remaining = 1
    }
    if (headers['x-ratelimit-limit']) {
      bkt.limit = parseInt(headers['x-ratelimit-limit'])
    }
  }

  /**
     * Execute a normal json request
     * @param {String} endpoint - Endpoint to use
     * @param {String} method - Http Method to use
     * @param {Object} data - Data to send
     * @param {Boolean} useParams - Whether to send the data in the body or use query params
     * @returns {Promise.<Object>} - resolveult of the request
     * @private
     */
  async _request (endpoint, method, data, useParams = false) {
    let headers = {}
    if (useParams) {
      return this.client({url: endpoint, method, params: data, headers})
    } else {
      return this.client({url: endpoint, method, data, headers})
    }
  }

  /**
     * Execute a multipart/form-data request
     * @param {String} endpoint - Endpoint to use
     * @param {String} method - Http Method to use
     * @param {Object} data - data to send
     * @param {Object} [data.file] - file to attach
     * @param {String} [data.file.name] - name of the file
     * @param {Buffer} [data.file.file] - Buffer with the file content
     * @returns {Promise.<Object>} - resolveult of the request
     * @private
     */
  async _multiPartRequest (endpoint, method, data) {
    let formData = new FormData()
    if (data.file.file) {
      if (data.file.name) {
        formData.append('file', data.file.file, {filename: data.file.name})
      } else {
        formData.append('file', data.file.file)
      }

      delete data.file.file
    }
    formData.append('payload_json', JSON.stringify(data))
    // :< axios is mean sometimes
    return this.client({
      url: endpoint,
      method,
      data: formData,
      headers: {'Content-Type': `multipart/form-data; boundary=${formData._boundary}`}
    })
  }
}

module.exports = RequestHandler
