const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
var request = require('request');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const auth = require('http-auth');
const authConnect = require("http-auth-connect");
const fs = require('fs');
const { phoneNumberFormatter } = require('./helpers/formatter');
const fileUpload = require('express-fileupload');
const port = process.env.PORT || 80;
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit')
const md5 = require("apache-md5");
const app = express();


let basic = auth.basic({
  realm: 'Login'
});
if (fs.existsSync(__dirname + '/htpasswd')) {
  basic = auth.basic({
    realm: 'Login',
    file: __dirname + '/htpasswd'
  });
}

const server = http.createServer(app);
const io = socketIO(server);
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 3, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message:
		'סבתא שך מתה תמות אמן',
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to all requests


app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.urlencoded({
  extended: true
}));

/**
 * BASED ON MANY QUESTIONS
 * Actually ready mentioned on the tutorials
 * 
 * The two middlewares above only handle for data json & urlencode (x-www-form-urlencoded)
 * So, we need to add extra middleware to handle form-data
 * Here we can use express-fileupload
 */
app.use(fileUpload({
  debug: false
}));

app.get('/logs', function (req, res) {
  let header = req.headers.authorization || '';       // get the auth header
  let token = header.split(/\s+/).pop() || '';        // and the encoded auth token
  let auth = Buffer.from(token, 'base64').toString(); // convert from base64
  let parts = auth.split(/:/);                        // split on colon
  let username = parts.shift();                       // username is first
  let password = parts.join(':');                     // everything else is the password

  if(username == "mosh" || username == 'Crapy') {
    res.sendFile('/main.log', {
      root: __dirname
    });
  }else{
    res.send("סבתא שלך סקרנית")
  }
})

app.post('/adduser', function (req, res) {
  let header = req.headers.authorization || '';       // get the auth header
  let token = header.split(/\s+/).pop() || '';        // and the encoded auth token
  let auth = Buffer.from(token, 'base64').toString(); // convert from base64
  let parts = auth.split(/:/);                        // split on colon
  let username = parts.shift();                       // username is first
  let password = parts.join(':');                     // everything else is the password

  let user_add = req.body.username
  let pass_add = req.body.password

  if(username == "mosh" || username == 'Crapy') {
    add_log(username, `added user ${user_add}`, req.ip)

    let encrypted_pass = md5(pass_add)
    let data_user = `${user_add}:${encrypted_pass}\n`;
    fs.appendFile('htpasswd', data_user, 'utf8',
      // callback function
      function(err) {     
          if (err) throw err;
          // if no error
          console.log( `(${datetime.toLocaleString()}) ${username} added user ${user_add} IP: ${req.ip}`)
    });
    res.send(`User ${user_add} was added successfully`);

  }else{
    res.send("סבתא שלך סקרנית")
  }
})


app.get('/user', function (req, res) {
  let header = req.headers.authorization || '';       // get the auth header
  let token = header.split(/\s+/).pop() || '';        // and the encoded auth token
  let auth = Buffer.from(token, 'base64').toString(); // convert from base64
  let parts = auth.split(/:/);                        // split on colon
  let username = parts.shift();                       // username is first
  let password = parts.join(':');                     // everything else is the password
  let page = req.query.page

  if(page == 'index' && (username == "Crapy" || username == "mosh")) {
    res.send(username + '<br><a href="/admin">Admin</a>')
  }else{
    res.send(username);
  }
})

app.get('/admin', function (req, res) {
  let header = req.headers.authorization || '';       // get the auth header
  let token = header.split(/\s+/).pop() || '';        // and the encoded auth token
  let auth = Buffer.from(token, 'base64').toString(); // convert from base64
  let parts = auth.split(/:/);                        // split on colon
  let username = parts.shift();                       // username is first
  let password = parts.join(':');                     // everything else is the password
  
  if(username == "mosh" || username == 'Crapy') {
    res.sendFile('/web/admin.html', {
      root: __dirname
    });
  }else{
    res.send("סבתא שלך סקרנית")
  }
})





app.get('/auth', (req, res) => {


  res.sendFile('index-multiple-account.html', {
    root: __dirname
  });
})

const sessions = [];
const SESSIONS_FILE = './whatsapp-sessions.json';

const createSessionsFileIfNotExists = function() {
  if (!fs.existsSync(SESSIONS_FILE)) {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]));
      console.log('Sessions file created successfully.');
    } catch(err) {
      console.log('Failed to create sessions file: ', err);
    }
  }
}

createSessionsFileIfNotExists();

const setSessionsFile = function(sessions) {
  fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), function(err) {
    if (err) {
      console.log(err);
    }
  });
}

const getSessionsFile = function() {
  return JSON.parse(fs.readFileSync(SESSIONS_FILE));
}


function add_log(username, text, ip) {
  let datetime = new Date();
  ip = ip.replace("::ffff:", "");
  let data = `(${datetime.toLocaleString()}) ${username} ${text} IP: ${ip}<br>`;
  fs.appendFile('main.log',data, 'utf8',
    // callback function
    function(err) {     
        if (err) throw err;
        // if no error
        console.log( `(${datetime.toLocaleString()}) ${username} ${text} IP: ${ip}<br>`)
  });

}

const createSession = function(id, description) {

  let worker = `.wwebjs_auth/session-${id}/Default/Service Worker`;

  if (fs.existsSync(worker)) {
    fs.rmSync(worker, { recursive: true });
  }

  console.log('Creating session: ' + id);
  const client = new Client({
    authStrategy: new LocalAuth({
        clientId: id
    })
  });
  


  client.initialize();

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      io.emit('qr', { id: id, src: url });
      io.emit('message', { id: id, text: 'QR Code received, scan please!' });
    });
  });

  client.on('ready', () => {
    console.log('ready '+id);  
    io.emit('ready', { id: id });
    io.emit('message', { id: id, text: 'Whatsapp is ready!' });

    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
    savedSessions[sessionIndex].ready = true;
    setSessionsFile(savedSessions);
  });

  client.on('authenticated', () => {
    io.emit('authenticated', { id: id });
    io.emit('message', { id: id, text: 'Whatsapp is authenticated!' });
  });

  client.on('auth_failure', function() {
    io.emit('message', { id: id, text: 'Auth failure, restarting...' });
  });

  client.on('disconnected', (reason) => {
    io.emit('message', { id: id, text: 'Whatsapp is disconnected!' });
    client.destroy();
    client.initialize();

    // Menghapus pada file sessions
    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex(sess => sess.id == id);
    savedSessions.splice(sessionIndex, 1);
    setSessionsFile(savedSessions);

    io.emit('remove-session', id);
  });

  // Tambahkan client ke sessions
  sessions.push({
    id: id,
    description: description,
    client: client
  });

  // Menambahkan session ke file
  const savedSessions = getSessionsFile();
  const sessionIndex = savedSessions.findIndex(sess => sess.id == id);

  if (sessionIndex == -1) {
    savedSessions.push({
      id: id,
      description: description,
      ready: false,
    });
    setSessionsFile(savedSessions);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const init = async function(socket) {
  const savedSessions = getSessionsFile();

  if (savedSessions.length > 0) {
    if (socket) {
      /**
       * At the first time of running (e.g. restarting the server), our client is not ready yet!
       * It will need several time to authenticating.
       * 
       * So to make people not confused for the 'ready' status
       * We need to make it as FALSE for this condition
       */
      savedSessions.forEach((e, i, arr) => {
        arr[i].ready = false;
      });

      socket.emit('init', savedSessions);
    } else {
      for(const sess of savedSessions) {
        console.log(sess.id)
        createSession(sess.id, sess.description);
        await sleep(2000);
      }
      console.log("ALL SESSIONS ARE READY FOR ATTACK")
    }
  }
}

init();

// Socket IO
io.on('connection', function(socket) {
  init(socket);

  socket.on('create-session', function(data) {
    console.log('Create session: ' + data.id);
    createSession(data.id, data.description);
  });
});


app.get('/', authConnect(basic), (req, res) => {
  res.sendFile('/web/management.html', {
    root: __dirname

    
    
  });
});


app.post('/zayan', authConnect(basic), limiter, authConnect(basic), async (req, res) => {
  let header = req.headers.authorization || '';       // get the auth header
  let token = header.split(/\s+/).pop() || '';        // and the encoded auth token
  let auth = Buffer.from(token, 'base64').toString(); // convert from base64
  let parts = auth.split(/:/);                        // split on colon
  let username = parts.shift();                       // username is first
  let password = parts.join(':');                     // everything else is the password
  let numberid = req.body.numberid;
  let curses = req.body.curse;
  let messageidonme = req.body.messageidonme;

  if (curses.length > 27 ){
    res.send("טריקים תעשה על דודה שלך יא צולע");
    return false;
  }

  add_log(username, `spammed ${numberid} with curses ${curses}`, req.ip)


  res.send('הבחור זויין'); 
  let usersconfig = require('./whatsapp-sessions.json'); 

  for (const Userbot in usersconfig){
    request.post(`http://127.0.0.1:${port}/send-message`, {
      form: {
        sender: usersconfig[Userbot].id,
        number: numberid,
        message: (curses.length == 1 || Userbot > curses.length) ? curses[Math.floor(Math.random() * curses.length)] : curses[Userbot]
      }
    }, function(err, res) {
      console.log(err, res);
    });
    await sleep(1000);
  }





});

// Send message
app.post('/send-message', async (req, res) => {
  const sender = req.body.sender;
  const number = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const client = sessions.find(sess => sess.id == sender)?.client;

  // Make sure the sender is exists & ready
  if (!client) {
    return res.status(422).json({
      status: false,
      message: `The sender: ${sender} is not found!`
    })
  }

  /**
   * Check if the number is already registered
   * Copied from app.js
   * 
   * Please check app.js for more validations example
   * You can add the same here!
   */
  const isRegisteredNumber = await client.isRegisteredUser(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

server.listen(port, function() {
  console.log('App running on *: ' + port);
});
