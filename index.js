const Router = require('express-promise-router')
const co = require('co')
const { Bag } = require('pg-bag')
const bcrypt = require('bcryptjs')

const omit = (object, key) => {
  const result = { }
  for (var k in object) {
    if (k !== key) {
      result[k] = object[k]
    }
  }
  return result
}

module.exports = function* (config) {
  const { pool, complexity = 10 } = config
  const bag = new Bag(pool)

  bag.addTable('session')

  bag.addTable('account', {
    columns: {
      email: { unique: true }
    }
  })

  yield bag.migrate(config.temp)

  const router = new Router()

  router.get('/session/:id', co.wrap(function* (req, res, next) {
    const { id } = req.params
    try {
      const session = yield bag.session.get(id)
      if (!session) {
        return next(404)
      }
    } catch (e) {
      return next(404)
    }
  }))

  router.post('/account', co.wrap(function* (req, res, next) {
    const { email, password } = req.body
    const existing = yield bag.account.find({ email })
    if (existing) {
      return next(400)
    }
    try {
      const data = {
        email,
        password: yield bcrypt.hash(password, complexity)
      }
      const acct = yield bag.account.put(data)
      return res.status(201).send(omit(acct, 'password'))
    } catch (e) {
      return next(400)
    }
  }))

  router.post('/session', co.wrap(function* (req, res, next) {
    const { email, password } = req.body
    const existing = yield bag.account.find({ email })
    if (!existing) {
      return next(404)
    }
    const goodPassword = yield bcrypt.compare(password, existing.password)
    if (!goodPassword) {
      console.log('password mispatch')
      return next(404)
    }
    res.status(201).end()
  }))

  return router
}

