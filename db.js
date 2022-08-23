const mysql = require('mysql2/promise')
const config = require('config')

const mysqlConfig = {
  host: config.get('mysql.host'),
  user: config.get('mysql.user'),
  password: config.get('mysql.password'),
  database: config.get('mysql.database')
}

const query = async (sql, params) => {
  const connection = await mysql.createConnection(mysqlConfig)
  const [results] = await connection.execute(sql, params)
  return results
}

module.exports = {
  query
}
