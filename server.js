const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');
const cors = require('cors');
const session = require('express-session'); 
const cookieParser = require('cookie-parser'); 
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const fs = require('fs');

const app = express();
const PORT = 3000;

const userDbPath = path.resolve(__dirname, 'database/database-user.db');
const forexDbPath = path.resolve(__dirname, 'database/database-forex.db');

const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let visitorCount = 0;

wss.on('connection', ws => {
  visitorCount++;
  wss.clients.forEach(client => {
    client.send(visitorCount);
  });

  ws.on('close', () => {
    visitorCount--;
    wss.clients.forEach(client => {
      client.send(visitorCount);
    });
  });
});

app.use(cors());

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Forex API",
            version: "1.0.0",
            description: "API per gestire i dati Forex"
        },
        servers: [
            {
                url: "https://sturdy-space-journey-976r4jpxr773p6xg-3000.app.github.dev",
                description: "Server locale"
            }
        ]
    },
    apis: ["./swagger.js"],
};


const userDb = new sqlite3.Database(userDbPath, (err) => {
    if (err) {
        console.error('Errore durante la connessione al database utenti:', err.message);
    } else {
        console.log('Connesso al database utenti SQLite.');
    }
});

const forexDb = new sqlite3.Database(forexDbPath, (err) => {
    if (err) {
        console.error('Errore durante la connessione al database Forex:', err.message);
    } else {
        console.log('Connesso al database Forex SQLite.');

        forexDb.run(`
            CREATE TABLE IF NOT EXISTS forex (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                valuta TEXT NOT NULL,
                giorno TEXT NOT NULL,
                massimo REAL NOT NULL,
                minimo REAL NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Errore durante la creazione della tabella forex:', err.message);
            } else {
                console.log('Tabella forex creata (se non esisteva già).');
            }
        });
    }
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

app.use(cookieParser()); 
app.use(session({ 
    secret: 'tuo_segreto_sicuro', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const swaggerDocument = swaggerJsDoc(swaggerOptions);

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));


app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
    passReqToCallback: true
},
function(req, accessToken, refreshToken, profile, done) {
    return done(null, profile);
}));

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/auth/google/callback',
        passport.authenticate('google', { failureRedirect: '/login' }),
        function(req, res) {
            req.session.user = req.user; // Salva l'utente nella sessione
            console.log("sessione salvata per utente google: ", req.user);
            req.session.user.capitale = 5000;
            res.redirect('/forex');
        });

app.get('/profile', (req, res) => {
    if (req.isAuthenticated()) {
        res.send(`Benvenuto, ${req.user.displayName}!`);
    } else {
        res.redirect('/login');
    }
});

wss.on('connection', ws => {
    visitorCount++;
    wss.clients.forEach(client => {
        client.send(visitorCount);
    });

    ws.on('close', () => {
        visitorCount--;
        wss.clients.forEach(client => {
            client.send(visitorCount);
        });
    });
});


app.post('/register', (req, res) => {
    const { nome, cognome, email, capitale, password } = req.body;

    if (!nome || !cognome || !email || !capitale || !password) {
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    const checkQuery = "SELECT * FROM users WHERE email = ?";
    userDb.get(checkQuery, [email], (err, user) => {
        if (err) {
            console.error('Errore durante il controllo dell\'email:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (user) {
            return res.status(409).json({ success: false, message: 'Email già registrata' });
        }

        const insertQuery = "INSERT INTO users (nome, cognome, email, capitale, password) VALUES (?, ?, ?, ?, ?)";
        userDb.run(insertQuery, [nome, cognome, email, capitale, password], (err) => {
            if (err) {
                console.error('Errore durante l\'inserimento nel database utenti:', err.message);
                return res.status(500).json({ success: false, message: 'Errore del server' });
            } else {
                return res.json({ success: true, message: 'Registrazione avvenuta con successo!' });
            }
        });
    });
});

app.post('/get-forex-data', (req, res) => {
    const { valuta } = req.body;

    const query = "SELECT giorno, open, close, massimo, minimo FROM forex WHERE valuta = ?";
    forexDb.all(query, [valuta], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero dei dati forex:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Dati non trovati' });
        }

        const formattedData = rows.map(row => ({
            giorno: row.giorno,
            open: row.open,
            massimo: row.massimo,
            minimo: row.minimo,
            close: row.close
        }));

        res.json({ success: true, data: formattedData });
    });
});


app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    if (email === '@root.itroot' && password === 'root') {
        req.session.user = { email: email, role: 'root' }; // Salva l'utente in sessione
        return res.json({
            success: true,
            redirect: '/indexRoot.html',
        });
    }

    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    userDb.get(query, [email, password], (err, user) => {
        if (err) {
            console.error('Errore durante la query di login:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: 'Email o password non validi' });
        }

        console.log("Login riuscito per:", email);

        req.session.user = { id: user.id, nome: user.nome, capitale: user.capitale }; // Salva l'utente in sessione

        res.json({
            success: true,
            user: { nome: user.nome, capitale: user.capitale },
            redirect: '/forex'
        });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logout effettuato' });
    });
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.post('/get-forex-data', (req, res) => {
    const { valuta } = req.body;

    if (!valuta) {
        return res.status(400).json({ success: false, message: 'Valuta non fornita' });
    }

    const query = "SELECT * FROM forex WHERE valuta = ?";
    forexDb.all(query, [valuta], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero dei dati:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nessun dato trovato per questa valuta' });
        }

        const formattedData = rows.map(row => ({
            giorno: row.data,         // Data originale per la tabella
            open: row.apertura,     // Prezzo apertura
            massimo: row.max,          // Prezzo massimo
            minimo: row.min,           // Prezzo minimo
            chiusura: row.chiusura     // Prezzo chiusura
        }));

        res.json({ success: true, data: formattedData });
    });
});


app.get('/list-users', (req, res) => {
    const query = "SELECT id, nome, cognome, email, capitale, password FROM users";

    userDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero degli utenti:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nessun utente trovato' });
        }

        res.json({ success: true, users: rows });
    });
});



app.get('/list-forex', (req, res) => {
    const query = "SELECT * FROM forex";

    forexDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero dei dati Forex:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nessun dato trovato nel database Forex' });
        }

        res.json({ success: true, forexData: rows });
    });
});

app.get('/forex/filter/:valuta', (req, res) => {
    let { valuta } = req.params;

    valuta = decodeURIComponent(valuta);

    if (!valuta) {
        return res.status(400).json({ success: false, message: 'Parametro valuta mancante' });
    }

    const query = "SELECT * FROM forex WHERE valuta = ?";
    forexDb.all(query, [valuta], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero dei dati filtrati:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Nessun dato trovato per questa valuta' });
        }

        res.json({ success: true, data: rows });
    });

    const data = {
        dates: rows.map(row => row.date),
        massimo: rows.map(row => row.open),
        minimo: rows.map(row => row.close)
    };
    res.json(data);
});

app.get('/users/filtered', (req, res) => {
    const query = "SELECT id, nome, cognome, email, capitale FROM users WHERE capitale > 4500";
    userDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero degli utenti filtrati:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        res.json({ success: true, users: rows });
    });
});



app.get('/users', (req, res) => {
    const query = "SELECT id, nome, cognome, email, capitale FROM users";
    userDb.all(query, [], (err, rows) => {
        if (err) {
            console.error('Errore durante il recupero degli utenti:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        res.json({ success: true, users: rows });
    });
});

app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    const query = "DELETE FROM users WHERE id = ?";
    userDb.run(query, [userId], (err) => {
        if (err) {
            console.error('Errore durante l\'eliminazione dell\'utente:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        res.json({ success: true, message: 'Utente eliminato con successo' });
    });
});

const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next(); // L'utente è autenticato, passa alla prossima rotta
    } else {
        res.status(401).json({ success: false, message: 'Non autenticato' });
    }
};



app.get('/forex', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forex.html'));
});

app.get('/indexRoot', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'indexRoot.html'));
});


const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
    console.log(`Server in esecuzione --> http://localhost:${PORT}`);
    console.log(`Swagger disponibile su --> http://localhost:${PORT}/api-docs`);
});

const db = new sqlite3.Database('database/database-forex.db');

db.run(`
    CREATE TABLE IF NOT EXISTS forex_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_currency TEXT,
        target_currency TEXT,
        rate REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

const API_KEY = process.env.FOREX_API_KEY; 
const API_URL = `https://api.forexrateapi.com/v1/latest?api_key=${API_KEY}&base=USD&currencies=EUR,INR,JPY`;

const saveForexRatesToDB = (rates) => {
    const query = `INSERT INTO forex_rates (base_currency, target_currency, rate) VALUES (?, ?, ?)`;

    Object.entries(rates).forEach(([pair, rate]) => {
        const [base, target] = pair.split('_');
        db.run(query, [base, target, rate], (err) => {
            if (err) {
                console.error(`Errore nell'inserimento dei dati: ${err.message}`);
            } else {
                console.log(`Dati salvati per ${base} -> ${target}: ${rate}`);
            }
        });
    });
};

const fetchAndSaveForexRates = async () => {
    try {
        const response = await axios.get(API_URL);
        const rates = response.data.rates;

        if (rates) {
            saveForexRatesToDB(rates);
        } else {
            console.log('URL chiamata API:', API_URL);
            console.error('Nessun dato ricevuto dall\'API.');
        }
    } catch (error) {
        console.error('Errore durante la chiamata API:', error.message);
    }
};

cron.schedule('0 0 * * *', fetchAndSaveForexRates);
