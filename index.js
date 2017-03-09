const Router = require('express-promise-router')
const co = require('co')
const { Bag } = require('pg-bag')

module.exports = function* (config) {
  const { pool } = config
  const bag = new Bag(pool)

  bag.addTable('session')

  bag.addTable('account', {
    columns: {
      email: { unique: true }
    }
  })

  console.log('migrating that shit')
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

  router.post('/account', co.wrap(function* (req, res) {
    const { email, password } = req.body
    const acct = yield bag.account.put({ email, password })
    console.log(email, password)
  }))

  return router
}
