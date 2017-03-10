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
    })

    const config = {
      pool: this.pool,
      temp: true,
      complexity: 1,
    }

    const app = express()
    const bodyParser = require('body-parser')
    app.use(bodyParser.json())
    app.get('/', (req, res) => res.send('ok'))
    const middle = yield routes(config)
    app.use(middle)
    app.use((err, req, res, next) => {
      console.log('fucking unhandled error', err)
      if (typeof err == 'number') {
        return res.status(err).end()
      }
      res.status(500).end()
    })
    this.client = new Client(app)
    this.client.start()
  }))

  beforeEach(function () {
    this.pool.query('BEGIN')
  })

  afterEach(function() {
    this.pool.query('ROLLBACK')
  })

  after(co.wrap(function* () {
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


  const signup = function* (client, email, password) {
    const options = {
      body: { email, password }
    }
    return client.post('/account', options)
  }

  const login = function* (client, email, password) {
    return client.post('/session', {
      body: { email, password }
    })
  }

  it('can create new account', co.wrap(function* () {
    const res = yield signup(this.client, 'foo@bar.com', 'foobar')
    expect(res.statusCode).to.eql(201)
    const { body } = res
    expect(body.id).to.be.a('string')
    expect(body).to.not.have.key('password')
    expect(body.email).to.eql('foo@bar.com')
  }))

  it('cannot create the same account twice', co.wrap(function* () {
    let res = yield signup(this.client, 'baz@bar.com', 'foobar')
    expect(res.statusCode).to.eql(201)
    res = yield signup(this.client, 'baz@bar.com', 'zug')
    expect(res.statusCode).to.eql(400)
  }))

  it('can login', co.wrap(function* () {
    const email = 'foo@bar.com'
    const password = 'yup'
    const res1 = yield signup(this.client, email, password)
    expect(res1.statusCode).to.eql(201)
    const res = yield login(this.client, email, password)
    const { body } = res
    expect(body.id).to.be.a('string')
    expect(body.accountId).to.equal(res1.body.id)
  }))

  it('denies login with wrong password', co.wrap(function* () {
    const res1 = yield signup(this.client, 'foo@bar.com', 'foobar')
    expect(res1.statusCode).to.eql(201)
    const res = yield login(this.client, 'foo@bar.com', 'zugzug')
    expect(res.statusCode).to.eql(404)
  }))

  it('denies login with wrong email', co.wrap(function* () {
    const res = yield login(this.client, 'foo@bar.com', 'zugzug')
    expect(res.statusCode).to.eql(404)
  }))
})
