const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
require('dotenv').config();          // load .env

const app = express();
const PORT = 3000;

// --- MongoDB connection + User model ---
console.log('MONGO_URI =', process.env.MONGO_URI);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });

const userSchema = new mongoose.Schema({
  fullname: String,
  phone: String,
  email: { type: String, unique: true },
  role: String,
  pin: String,                     // current PIN (temp or custom)
  hasCustomPin: { type: Boolean, default: false }, // false after register
  status: { type: String, default: 'active' }      // active / inactive
});

const User = mongoose.model('User', userSchema);

// TEMP: store logged‑in user email just for testing
let currentUserEmail = null;

console.log('EMAIL_USER =', process.env.EMAIL_USER);
console.log('EMAIL_PASS =', process.env.EMAIL_PASS ? '***set***' : 'NOT SET');

// serve CSS and other static assets from /public
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // read form fields

// helper to render login page with optional error (phone + PIN)
function renderLogin(res, errorMessage = '') {
  const errorHtml = errorMessage
    ? `<p style="color:#dc2626;font-size:14px;margin-top:4px;">${errorMessage}</p>`
    : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>KVF Login</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="form-container">
        <div class="form-header">
          <h1>Login</h1>
          <p>Use your registered mobile number and PIN.</p>
        </div>

        <form method="POST" action="/login">
          <div class="form-group">
            <label>Mobile number *</label>
            <input name="phone" type="tel"
                   placeholder="Enter your mobile number" required>
          </div>

          <div class="form-group">
            <label>PIN *</label>
            <input name="pin" type="password" minlength="4" maxlength="6"
                   placeholder="Enter your PIN" required>
            ${errorHtml}
          </div>

          <div class="form-actions">
            <a href="/register">New user? Register</a>
            <button class="primary-btn" type="submit">Login</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
}

// helper to render register page with success and error messages
function renderRegister(res, options = {}) {
  const { showSuccess = false, errorMessage = '' } = options;

  const successHtml = showSuccess
    ? '<p style="color:#16a34a;font-size:14px;margin-bottom:8px;">Registration successful.</p>'
    : '';

  const errorHtml = errorMessage
    ? `<p style="color:#dc2626;font-size:14px;margin-bottom:8px;">${errorMessage}</p>`
    : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>KVF Registration</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="form-container">
        <div class="form-header">
          <h1>KVF Training Programme Management System</h1>
          <p>Complete this form to register. Fields marked with * are required.</p>
        </div>

        ${successHtml}
        ${errorHtml}

        <form method="POST" action="/register">
          <div class="form-group">
            <label>Full name *</label>
            <input
              name="fullname"
              type="text"
              placeholder="Enter the full name"
              required
            >
            <div class="helper-text">Example: John A.</div>
          </div>

          <div class="form-group">
            <label>Mobile number *</label>
            <input
              name="phone"
              type="tel"
              placeholder="Enter the 10-digit mobile number"
              required
            >
            <div class="helper-text">Format: 10 digits, e.g., 9876543210</div>
          </div>

          <div class="form-group">
            <label>E‑mail ID *</label>
            <input
              name="email"
              type="email"
              placeholder="Enter the e‑mail address"
              required
            >
            <div class="helper-text">Enter a valid e‑mail address.</div>
          </div>

          <div class="form-group">
            <label>Role *</label>
            <select name="role" required>
              <option value="">Select role</option>
              <option value="Student">Student</option>
              <option value="Trainer">Trainer</option>
              <option value="Zonal Coordinator">Zonal Coordinator</option>
              <option value="Management">Management</option>
            </select>
          </div>

          <div class="form-actions">
            <a href="/login">Already registered?</a>
            <button class="primary-btn" type="submit">Register</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
}

// helper to render set‑pin page with optional error
function renderSetPin(res, errorMessage = '') {
  const errorHtml = errorMessage
    ? `<p style="color:#dc2626;font-size:14px;margin-bottom:8px;">${errorMessage}</p>`
    : '';

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Set New PIN</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="form-container">
        <div class="form-header">
          <h1>Set new login PIN</h1>
          <p>Choose a 4‑digit PIN and confirm it to continue.</p>
        </div>

        ${errorHtml}

        <form method="POST" action="/set-pin">
          <div class="form-group">
            <label>New PIN *</label>
            <input name="newPin" type="password" minlength="4" maxlength="4"
                   placeholder="Enter the new PIN" required>
            <div class="helper-text">4‑digit numeric PIN.</div>
          </div>

          <div class="form-group">
            <label>Confirm PIN *</label>
            <input name="confirmPin" type="password" minlength="4" maxlength="4"
                   placeholder="Re-enter the new PIN" required>
          </div>

          <div class="form-actions">
            <button class="primary-btn" type="submit">Save PIN</button>
          </div>
        </form>
      </div>
    </body>
    </html>
  `);
}

// open register page first
app.get('/', (req, res) => {
  res.redirect('/register');
});

app.get('/register', (req, res) => {
  const showSuccess = req.query.success === '1';
  renderRegister(res, { showSuccess });
});

// GET login uses renderLogin
app.get('/login', (req, res) => {
  renderLogin(res);
});

// dashboard page
app.get('/dashboard', (req, res) => {
  if (!currentUserEmail) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// set‑pin page
app.get('/set-pin', (req, res) => {
  if (!currentUserEmail) return res.redirect('/login');
  renderSetPin(res);
});

// handle register submit
app.post('/register', async (req, res) => {
  const { fullname, phone, email, role } = req.body;

  // check if phone already exists
  const existingByPhone = await User.findOne({ phone });
  if (existingByPhone) {
    return renderRegister(res, {
      showSuccess: false,
      errorMessage: 'User already registered. Please login.'
    });
  }

  // 1) generate 4‑digit temporary PIN
  const pin = Math.floor(1000 + Math.random() * 9000).toString();

  // 2) save user + temp pin + role + phone to MongoDB
  await User.findOneAndUpdate(
    { email },
    { fullname, phone, email, role, pin, hasCustomPin: false, status: 'active' },
    { upsert: true, new: true }
  );

  // 3) send email with temporary PIN
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your KVF temporary PIN',
    text: `Hi ${fullname},\n\nYour temporary login PIN is ${pin}.`
  });

  // 4) show success on same page
  renderRegister(res, { showSuccess: true });
});

// handle login submit – PHONE + PIN + status checks
app.post('/login', async (req, res) => {
  const { phone, pin } = req.body;

  const user = await User.findOne({ phone });

  if (!user) {
    return renderLogin(res, 'User not registered');
  }

  if (user.status !== 'active') {
    return renderLogin(res, 'User is inactive. Please contact management.');
  }

  if (user.pin !== pin) {
    return renderLogin(res, 'Invalid PIN');
  }

  currentUserEmail = user.email;

  if (!user.hasCustomPin) {
    return res.redirect('/set-pin');
  }

  return res.redirect('/dashboard');
});

// handle new PIN submit – update DB, then force login again
app.post('/set-pin', async (req, res) => {
  const { newPin, confirmPin } = req.body;

  if (!currentUserEmail) return res.redirect('/login');

  if (newPin !== confirmPin) {
    // stay on same page with red error text
    return renderSetPin(res, "PINs don't match.");
  }

  await User.updateOne(
    { email: currentUserEmail },
    { $set: { pin: newPin, hasCustomPin: true } }
  );

  currentUserEmail = null;          // must login again with new PIN
  res.redirect('/login');
});

// management route to change status
app.post('/manage/status', async (req, res) => {
  const { email, status } = req.body;  // status: 'active' or 'inactive'

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).send('Invalid status value');
  }

  await User.updateOne({ email }, { $set: { status } });
  res.send(`Status updated to ${status}`);
});

app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
