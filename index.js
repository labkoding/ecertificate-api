const config = require('config')
const express = require('express')
const app = express()
const port = config.get('port')

app.get('/v1', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v1'
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
