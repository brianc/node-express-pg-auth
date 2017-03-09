const { expect } = require('chai')
const Pool = require('pg-pool')
const co = require('co')
const express = require('express')

const Client = require('./client')
const routes = require('../')

const bootstrapQuery = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TEMP TABLE sessions(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),
  data JSON
)`

describe('app', () => {
  before(co.wrap(function* () {
    this.pool = new Pool({
      max: 1
    });

    this.pool.query('BEGIN')

    const config = { pool: this.pool, temp: true }

    const app = express()
    const bodyParser = require('body-parser')
    app.use(bodyParser.json())
    app.get('/', (req, res) => res.send('ok'))
    const middle = yield routes(config)
    app.use(middle)
    app.use((err, req, res, next) => {
      console.log('fucking unhandled error', err)
      if (typeof err == 'number') {
        res.status(err).end()
      }
      throw err
    })
    this.client = new Client(app)
    this.client.start()
  }))

  after(co.wrap(function* () {
    yield this.pool.query('ROLLBACK')
    yield this.client.stop()
  }))

  it('can get / as smoke test', co.wrap(function* () {
    const res = yield this.client.get('/')
    expect(res.statusCode).to.equal(200)
  }))

  it('gets 404 for not found sesion', co.wrap(function* () {
    const res = yield this.client.get('/session')
    expect(res.statusCode).to.equal(404)
  }))

  it('gets 404 for missing session', co.wrap(function* () {
    const res = yield this.client.get('/session/foo')
    expect(res.statusCode).to.eql(404)
  }))

  it.only('can create new account', co.wrap(function* () {
    const options = {
      body: {
        email: 'foo@bar.com',
        password: 'foobar',
      },
    }
    const res = yield this.client.post('/account', options)
    expect(res.statusCode).to.eql(201)
  }))
})
