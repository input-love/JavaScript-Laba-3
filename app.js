const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const { Liquid } = require('liquidjs');
const engine = new Liquid();

const app = express();
const port = 3000;
const file = path.join(__dirname, 'auth_info.txt');

// Генерируем случайную строку из 32 байт (256 бит) и преобразуем её в шестнадцатеричное представление
const randomBytes = crypto.randomBytes(32);
const sessionSecret = randomBytes.toString('hex');

app.set('trust proxy', 1);
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
}));
app.use(cookieParser());

app.engine('liquid', engine.express());
app.set('views', './views');
app.set('view engine', 'liquid');

app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.session.user) {
    req.user = {
      id: req.session.user
    };
  }
  next();
});

function addUser(req, res, userDate) {
  if (req.session.user) {
    fs.readFile("auth_info.txt", "utf8", (error, data) => {
      if (error)  throw error;
      const arr = data.split("\r");
      if (arr.includes(userDate)) {
        res.redirect('/');
        return;
      } else {
        fs.appendFile('auth_info.txt', userDate + '\r', (error) => {
          if (error) throw error;
          res.redirect('/');
        });
      }
    });
  }
}

function auth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/login', (req, res) => res.render('login'));

app.post('/login', (req, res) => {
  if (!req.body.user || !req.body.password) {
    res.render('login', { message: 'Enter your username and password!' });
  } else if (req.body.user == 'admin' && req.body.password == '12345') {
    req.session.user = 'admin';
    const userDate = `Role: ${req.session.user} | Password: ${req.body.password}`;
    addUser(req, res, userDate);
  } else {
    req.session.user = 'user';
    const userDate = `Role: ${req.session.user} | Password: ${req.body.password}`;
    addUser(req, res, userDate);
  }
});

app.get('/', auth, (req, res) => {
  res.render('home', {
    userId: req.user.id
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(function() {
    console.log('Выход!');
  });
  res.redirect('/login');
});

app.get('/list', (req, res) => {
  if (req.session.user == 'admin') {
    fs.readFile('auth_info.txt', 'utf8', (err, data) => {
      if (err)  throw err;
      const arr = data.split('\r');
      const newArr = arr.map(item => `<br>${item}<br/>`);
      res.render('list', {
        arr: newArr
      });
    });
  } else {
    res.render('error');
  }
});

app.use((err, req, res, next) => {
  res.render('error');
});

app.listen(port, () => console.log(`Example app listening on port ${port}`));