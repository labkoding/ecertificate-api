const config = require('config')
const express = require('express')
const app = express()
const port = config.get('port')

// mysql connection
// const mysql = require('mysql')
// const connection = mysql.createConnection({
//   host: config.get('mysql.host'),
//   user: config.get('mysql.user'),
//   password: config.get('mysql.password'),
//   database: config.get('mysql.database')
// })

// connection.connect()

app.get('/v1', (req, res) => {

  res.json({
    status: 'ok',
    version: 'v1'
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
