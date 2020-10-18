
module.exports = function () {
  const argsLength = arguments.length
  return {
    myGet (req, res) {
      res.send('get: ' + argsLength)
    },
    myPost (req, res) {
      res.send('post: ' + argsLength)
    }
  }
}

throw Error('Outside error')