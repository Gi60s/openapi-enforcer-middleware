
module.exports = function () {
  const argsLength = arguments.length
  const data = argsLength > 0 ? ' ' + Array.from(arguments).toString() : ''
  return {
    myGet (req, res) {
      res.send('get: ' + argsLength + data)
    },
    myPost (req, res) {
      res.send('post: ' + argsLength + data)
    }
  }
}