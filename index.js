const config = require('config')
const express = require('express')
const db = require('./db')
const app = express()
const port = config.get('port')

app.get('/v1/users/read', async (req, res) => {
  const results = await db.query('SELECT * FROM tb_user')
  res.json({ status: 'ok', data: results })
})
app.get('/v1/users/create', async (req, res) => {
  const results = await db.query('INSERT INTO tb_user(id, full_name, email, password) VALUES ("aadf", "John Doe", "adfdfd", "dfdfdfdfdf")')
  res.json({ status: 'ok', data: results })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
