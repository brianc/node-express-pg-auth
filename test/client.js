const http = require('http')

const request = require('request-promise-native').defaults({
  json: true,
  simple: false,
  resolveWithFullResponse: true,
})

module.exports = class Client {
  constructor(app) {
    this.app = app
    this.server = undefined
    this.port = undefined
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.app)
        .listen(() => {
          this.port = this.server.address().port
          console.log('started')
          resolve()
        })
    })
  }

  stop() {
    return new Promise((resolve, reject) => {
      this.server.close(resolve)
    })
  }

  req(method, path, opts = {}) {
    opts.method = method
    opts.url = `http://localhost:${this.port}${path}`
    return request(opts)
  }

  get(path, opts = {}) {
    return this.req('get', path, opts)
  }

  post(path, opts = {}) {
    return this.req('post', path, opts)
  }
}
