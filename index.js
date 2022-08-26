const config = require('config')
const express = require('express')
var uuid = require('uuid')
var cors = require('cors')
var moment = require('moment')
var SHA256 = require('crypto-js/sha256')
var nodemailer = require('nodemailer')

const db = require('./db')
const app = express()
const port = config.get('port')

var transporter = nodemailer.createTransport({
  port: 465, // true for 465, false for other ports
  host: 'mail.labkoding.co.id',
  auth: {
    user: 'admin@labkoding.co.id',
    pass: 'pBm4iAfUYBI&'
  },
  secure: true
})

app.use(express.json())
app.use(cors({ exposedHeaders: 'Authorization' }))

function sanitizeString (str) {
  // str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"")
  return str.trim()
}

app.get('/v1/users/read', async (req, res) => {
  const results = await db.query('SELECT * FROM tb_user')
  res.json({ status: 'ok', data: results })
})
app.get('/v1/users/create', async (req, res) => {
  const results = await db.query('INSERT INTO tb_user(id, full_name, email, password) VALUES ("aadf", "John Doe", "adfdfd", "dfdfdfdfdf")')
  res.json({ status: 'ok', data: results })
})
app.post('/v1/otp/validate/signup', async (req, res) => {
  console.log('otp signup validate invoked')
  const results = await db.query('SELECT * FROM tb_otp WHERE otp_ref = ?', [req.body.otpRef])
  if (results.length > 0) {
    if (results[0].otp === req.body.otp && results[0].retry_count < 3 && moment().isBefore(results[0].expiry_dt)) {
      const users = await db.query('SELECT * FROM tb_user WHERE id = ?', [results[0].entity_id])
      await db.query('UPDATE tb_user SET is_verified = "Y" WHERE id = ?', [results[0].entity_id])
      await db.query('UPDATE tb_otp SET retry_count = ?, validated = "success" WHERE id = ?', [results[0].retry_count + 1, results[0].id])
      var mailOptions = {
        from: 'admin@labkoding.co.id',
        to: users[0].email,
        subject: 'Ecertificate App Success Signup',
        text: 'Your are successfully signup to Ecertificate App'
      }

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log('Email sent error: ' + error)
        } else {
          console.log('Email sent: ' + info.response)
        }
      })
      res.json({ status: 'ok', data: results, entityId: results[0].entity_id })
    } else {
      await db.query('UPDATE tb_otp SET retry_count = ? WHERE id = ?', [results[0].retry_count + 1, results[0].id])
      res.json({ status: 'nok', message: 'Invalid OTP' })
    }
  } else {
    await db.query('UPDATE tb_otp SET retry_count = ? WHERE id = ?', [results[0].retry_count + 1, results[0].id])
    res.json({ status: 'nok', message: 'Invalid OTP' })
  }
})
app.post('/v1/otp/validate/forgotpassword', async (req, res) => {
  console.log('otp forgotpassword validate invoked')
  const results = await db.query('SELECT * FROM tb_otp WHERE otp_ref = ?', [req.body.otpRef])
  console.log('results', results)
  if (results.length > 0) {
    const retryCount = results[0].retry_count + 1
    console.log('retryCount: ' + retryCount)
    if (results[0].otp === req.body.otp && results[0].retry_count < 3 && moment().isBefore(results[0].expiry_dt)) {
      await db.query('UPDATE tb_otp SET retry_count = ?, validated = "success" WHERE id = ?', [results[0].retry_count + 1, results[0].id])
      res.json({ status: 'ok', data: results, entityId: results[0].entity_id })
    } else {
      await db.query('UPDATE tb_otp SET retry_count = ? WHERE id = ?', [results[0].retry_count + 1, results[0].id])
      res.json({ status: 'nok', message: 'Invalid OTP' })
    }
  } else {
    await db.query('UPDATE tb_otp SET retry_count = ? WHERE id = ?', [results[0].retry_count + 1, results[0].id])
    res.json({ status: 'nok', message: 'Invalid OTP' })
  }
})
app.post('/v1/users/forgotpassword', async (req, res) => {
  const now = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
  const otpRef = '' + SHA256('' + uuid.v4())
  const otp = Math.floor(100000 + Math.random() * 900000)
  const results = await db.query('SELECT * FROM tb_user WHERE email = ?', [req.body.email])
  if (results.length > 0) {
    const otpId = '' + uuid.v4()
    const expiryDt = moment().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss.SSS')
    const results2 = await db.query('INSERT INTO tb_otp (id, otp_ref, entity_id, otp, expiry_dt, retry_count, created_dt, updated_dt, action) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [otpId, otpRef, results[0].id, otp, expiryDt, 0, now, now, 'forgotpassword'])
    var mailOptions = {
      from: 'admin@labkoding.co.id',
      to: req.body.email,
      subject: 'Ecertificate App OTP for change password',
      text: 'Change password OTP : ' + otp
    }
    console.log('send email begin')
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email sent error: ' + error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })
    res.json({ status: 'ok', data: results2, otpRef: '' + otpRef })
  } else {
    res.json({ status: 'nok', message: 'invalid email' })
  }
})
app.post('/v1/users/login', async (req, res) => {
  const now = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
  const password = '' + SHA256(req.body.password)
  const loginId = '' + uuid.v4()
  const results = await db.query('SELECT * FROM tb_user WHERE email = ? and password = ?', [req.body.email, password])
  if (results.length > 0) {
    const expiryDt = moment().add(6, 'M').format('YYYY-MM-DD HH:mm:ss.SSS')
    const results2 = await db.query('INSERT INTO tb_login (id, user_id, login_dt, expiry_dt, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?)', [loginId, results[0].id, now, expiryDt, results[0].is_verified, 'Y'])
    res.json({ status: 'ok', data: results2, loginId: '' + loginId, userProfile: results[0] })
  } else {
    res.json({ status: 'nok', message: 'invalid email or password' })
  }
})
app.post('/v1/users/set-new-password', async (req, res) => {
  const now = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
  const userId = req.body.userId
  const password = '' + SHA256(req.body.password)
  try {
    const users = await db.query('SELECT * FROM tb_user WHERE id = ?', [userId])
    const resultUpdateb = await db.query('UPDATE tb_user SET password = ?, updated_dt= ? WHERE id = ?', [password, now, userId])
    console.log('resultUpdateb', resultUpdateb)
    var mailOptions = {
      from: 'admin@labkoding.co.id',
      to: users[0].email,
      subject: 'Ecertificate App Success Change Password',
      text: 'Your password has been changed'
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email sent error: ' + error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })
    res.json({ status: 'ok' })
  } catch (err) {
    res.json({ status: 'nok' })
  }
})
app.post('/v1/users/signup', async (req, res) => {
  console.log('signup invoked')
  const now = moment().format('YYYY-MM-DD HH:mm:ss.SSS')
  const userId = '' + uuid.v4()
  // convert email to lowercase
  const email = req.body.email.toLowerCase()
  let sql = 'INSERT INTO tb_user(id, full_name, email, password, created_dt, updated_dt) VALUES ("' + userId + '",'
  sql += '"' + sanitizeString(req.body.fullname) + '",'
  sql += '"' + sanitizeString(email) + '",'
  sql += '"' + SHA256(req.body.password) + '",'
  sql += '"' + now + '",'
  sql += '"' + now + '")'

  var otpExpireDt = moment().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss.SSS')
  const otpRef = SHA256('' + uuid.v4())
  const otp = Math.floor(100000 + Math.random() * 900000)
  let sqlOtp = 'INSERT INTO tb_otp(id, otp_ref, otp, retry_count, action, entity_id, expiry_dt, created_dt, updated_dt) VALUES ("' + uuid.v4() + '",'
  sqlOtp += '"' + otpRef + '",'
  sqlOtp += '"' + otp + '",'
  sqlOtp += '"' + 0 + '",'
  sqlOtp += '"signup",'
  sqlOtp += '"' + userId + '",'
  sqlOtp += '"' + otpExpireDt + '",'
  sqlOtp += '"' + now + '",'
  sqlOtp += '"' + now + '")'

  try {
    const sqlResults = await db.query(sql)
    await db.query(sqlOtp)
    var mailOptions = {
      from: 'admin@labkoding.co.id',
      to: req.body.email,
      subject: 'Ecertificate App OTP for signup',
      text: 'Signup OTP : ' + otp
    }
    console.log('send email begin')
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log('Email sent error: ' + error)
      } else {
        console.log('Email sent: ' + info.response)
      }
    })
    res.json({ status: 'ok', data: sqlResults, otpRef: '' + otpRef })
  } catch (err) {
    console.log('ada error')
    console.log(err)
    res.json({ status: 'nok', message: err })
  }
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
