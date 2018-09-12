const Comicvine = require('./src/Comicvine')
function ComicVine (...args) {
  return new Comicvine(...args)
}

module.exports.ComicVine = ComicVine
module.exports = ComicVine
