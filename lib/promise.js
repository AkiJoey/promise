// promise implementation

const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

function Promise(callback) {
  this.state = PENDING
  this.value = null
  this.error = null
  this.onFulfilledCallbacks = []
  this.onRejectedCallbacks = []
  const self = this
  function resolve(value) {
    if (value instanceof Promise) {
      return value.then(resolve, reject)
    }
    if (self.state === PENDING) {
      setTimeout(() => {
        self.state = FULFILLED
        self.value = value
        self.onFulfilledCallbacks.forEach(callback => {
          callback(value)
        })
      }, 0)
    }
  }
  function reject(error) {
    if (self.state === PENDING) {
      setTimeout(() => {
        self.state = REJECTED
        self.error = error
        self.onRejectedCallbacks.forEach(callback => {
          callback(error)
        })
      }, 0)
    }
  }
  try {
    callback(resolve, reject)
  } catch (e) {
    reject(e)
  }
}

const resolvePromise = (promise, x, resolve, reject) => {
  if (promise === x) {
    reject(new TypeError('Circular reference'))
  }
  if ((x && typeof x === 'object') || typeof x === 'function') {
    let called = false
    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(
          x,
          y => {
            if (!called) {
              called = true
              resolvePromise(promise, y, resolve, reject)
            }
          },
          error => {
            if (!called) {
              called = true
              reject(error)
            }
          }
        )
      } else {
        resolve(x)
      }
    } catch (e) {
      if (!called) {
        called = true
        reject(e)
      }
    }
  } else {
    resolve(x)
  }
}

const onFulfilledCallback = (onFulfilled, value, promise, resolve, reject) => {
  try {
    const x = onFulfilled(value)
    resolvePromise(promise, x, resolve, reject)
  } catch (e) {
    reject(e)
  }
}

const onRejectedCallback = (onRejected, error, promise, resolve, reject) => {
  try {
    const x = onRejected(error)
    resolvePromise(promise, x, resolve, reject)
  } catch (e) {
    reject(e)
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  let promise = null
  onFulfilled =
    typeof onFulfilled === 'function'
      ? onFulfilled
      : value => {
          return value
        }
  onRejected =
    typeof onRejected === 'function'
      ? onRejected
      : error => {
          throw error
        }
  if (this.state === PENDING) {
    return (promise = new Promise((resolve, reject) => {
      this.onFulfilledCallbacks.push(value => {
        onFulfilledCallback(onFulfilled, value, promise, resolve, reject)
      })
      this.onRejectedCallbacks.push(error => {
        onRejectedCallback(onRejected, error, promise, resolve, reject)
      })
    }))
  }
  if (this.state === FULFILLED) {
    return (promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        onFulfilledCallback(onFulfilled, this.value, promise, resolve, reject)
      }, 0)
    }))
  }
  if (this.state === REJECTED) {
    return (promise = new Promise((resolve, reject) => {
      setTimeout(() => {
        onRejectedCallback(onRejected, this.error, promise, resolve, reject)
      }, 0)
    }))
  }
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.prototype.finally = function (callback) {
  return this.then(
    value => {
      return Promise.resolve(callback).then(() => {
        return value
      })
    },
    error => {
      return Promise.reject(callback).then(() => {
        throw error
      })
    }
  )
}

Promise.prototype.done = function (onFulfilled, onRejected) {
  this.then(onFulfilled, onRejected).catch(error => {
    setTimeout(() => {
      throw error
    }, 0)
  })
}

// Promise.all
Promise.all = function (promises) {
  return new Promise((resolve, reject) => {
    const arr = []
    promises.forEach((promise, index) => {
      promise.then(
        value => {
          arr[index] = value
          if (index === promises.length - 1) {
            resolve(arr)
          }
        },
        error => {
          reject(error)
        }
      )
    })
  })
}

// Promise.race
Promise.race = function (promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(promise => {
      promise.then(
        value => {
          resolve(value)
        },
        error => {
          reject(error)
        }
      )
    })
  })
}

// Promise.resolve
Promise.resolve = function (value) {
  return new Promise(resolve => {
    resolve(value)
  })
}

// Promise.reject
Promise.reject = function (error) {
  return new Promise((resolve, reject) => {
    reject(error)
  })
}

// Promise.promisify from bluebird
Promise.promisify = function (callback) {
  return function () {
    const args = Array.from(arguments)
    return new Promise((resolve, reject) => {
      callback.apply(
        null,
        args.concat(error => {
          error ? reject(error) : resolve(arguments[1])
        })
      )
    })
  }
}

module.exports = Promise
