const store = []
let index = 0

exports.getList = function (req, res) {
  // the response will be validated and serialized by the middleware
  res.send(store)
}

exports.addTask = function (req, res) {
  // no need to validate the body because
  // the middleware has already validated the request

  const body = req.body
  const task = {
    id: index++,
    title: body.title,
    due: body.due,
    completed: body.completed
  }
  store.push(task)

  // the response will be validated and serialized by the middleware
  res.send(task)
}

exports.deleteTask = function (req, res) {
  // no need to validate the body because
  // the middleware has already validated the request
  const index = store.findIndex(task => task.id === req.params.id)
  if (index !== -1) store.splice(index, 1)

  // the response will be validated and serialized by the middleware
  res.sendStatus(204)
}

exports.getTask = function (req, res) {
  // no need to validate the body because
  // the middleware has already validated the request

  const task = findTask(req.params.task_id)

  // the response will be validated and serialized by the middleware
  if (task) {
    res.send(task)
  } else {
    res.sendStatus(404)
  }
}

exports.updateTask = function (req, res) {
  // no need to validate the body because
  // the middleware has already validated the request

  const task = findTask(req.params.id)

  // the response will be validated and serialized by the middleware
  if (task) {
    const body = req.body
    task.title = body.title
    task.due = body.due
    task.completed = body.completed
    res.send(task)
  } else {
    res.sendStatus(404)
  }
}

function findTask (taskId) {
  const index = store.findIndex(task => task.id === taskId)
  return index === -1 ? undefined : store[index]
}
