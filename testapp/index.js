require('dotenv').config()

const ComicVine = require('../src/Comicvine')
let prompt = require('prompt')
let colors = require('colors/safe')

let client = new ComicVine(process.env.API_KEY)

async function test () {
  /* prompt.message = colors.red('ComicVine')
  prompt.delimiter = colors.green('>>')
  prompt.start()

  prompt.get({
    properties: {
      comic: {
        description: colors.magenta('What comic would you like info on?')
      }
    }
  }, function (err, result) {
    getComic(result.comic)
  }) */
  let _comic = await client.volume.find({
    id: 112031,
    sort: 'name:desc'
  })
  // console.log(_comic)
  console.log(_comic.results.characters[0])
}

async function getComic (comic) {
  let _comic = await client.search.issue({
    id: 683825,
    sort: 'name:desc'
  })
  let __comic = _comic.results[0]
  console.log(`
  ========================================
  Comic: ${__comic.name}
  Description: ${__comic.description}
  Publisher: ${__comic.publisher.name}
  Released: ${__comic.start_year}
  Issues: ${__comic.count_of_issues}
  ========================================
  `)
}

test().catch(error => console.log(error))
