// TaskMaster API - hardened: helmet, no Mongoose callbacks (removed in Mongoose 7+), safe body handling
var express = require('express');
var helmet = require('helmet');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');
var _ = require('lodash');
var moment = require('moment');
var axios = require('axios');

var app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
app.use(function (req, res, next) {
  res.set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(bodyParser.json({ limit: '100kb' }));

var SECRET = process.env.JWT_SECRET || 'change-me-lab-only';
var WORKER_URL = process.env.WORKER_URL || 'http://localhost:5000';

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/taskmaster')
  .catch(function (err) { console.error('Mongo connection error:', err.message); });

var Task = mongoose.model('Task', new mongoose.Schema({
  title: String,
  owner: String,
  due: Date,
  meta: {},
  done: { type: Boolean, default: false }
}));

function auth(req, res, next) {
  var h = req.headers.authorization || '';
  jwt.verify(h.replace('Bearer ', ''), SECRET, { algorithms: ['HS256'] }, function (err, user) {
    if (err) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  });
}

app.get('/', function (req, res) {
  res.json({ status: 'ok', name: 'TaskMaster API' });
});

app.get('/robots.txt', function (req, res) {
  res.type('text/plain').send('User-agent: *\nDisallow: /');
});

app.get('/sitemap.xml', function (req, res) {
  res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
});

app.get('/health', function (req, res) {
  res.json({ status: 'ok', time: moment().format() });
});

app.post('/login', function (req, res) {
  // TODO: replace stub with real user store
  var token = jwt.sign({ sub: req.body.user || 'demo' }, SECRET, { expiresIn: '7d' });
  res.json({ token: token });
});

app.get('/tasks', auth, function (req, res) {
  Task.find({ owner: req.user.sub })
    .then(function (tasks) { res.json(tasks); })
    .catch(function (err) { res.status(500).json({ error: err.message }); });
});

app.post('/tasks', auth, function (req, res) {
  // whitelist fields; owner always comes from the token, never from the body
  var data = _.assign(_.pick(req.body, ['title', 'due', 'meta', 'done']), { owner: req.user.sub });
  Task.create(data)
    .then(function (task) { res.status(201).json(task); })
    .catch(function (err) { res.status(500).json({ error: err.message }); });
});

app.post('/tasks/:id/remind', auth, function (req, res) {
  axios.post(WORKER_URL + '/jobs', { task_id: req.params.id, user: req.user.sub })
    .then(function (r) { res.json(r.data); })
    .catch(function (e) { res.status(502).json({ error: e.message }); });
});

var port = process.env.PORT || 3000;
app.listen(port, function () { console.log('TaskMaster API on ' + port); });