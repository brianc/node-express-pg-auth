const chai = require('chai')

chai.Assertion.addMethod('eql', function(val) {
  this.assert(
    this._obj == val,
    `expected ${this._obj} to be ${val}`,
    `expected ${this._obj} to not be ${val}`)
})
