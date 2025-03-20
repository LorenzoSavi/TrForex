const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');
const cors = require('cors');
const session = require('express-session'); 
const cookieParser = require('cookie-parser'); 

const app = express();
const PORT = 3000;

const userDbPath = path.resolve(__dirname, 'database-user.db');
const forexDbPath = path.resolve(__dirname, 'database-forex.db');


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
    apis: ["./server.js"], 
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

app.use(cookieParser()); 
app.use(session({ 
    secret: 'tuo_segreto_sicuro', 
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const corsOptions = {
    origin: ['http://sturdy-space-journey-976r4jpxr773p6xg.app.github.dev'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

const swaggerDocument = swaggerJsDoc(swaggerOptions);

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));


app.use(cors(corsOptions));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registra un nuovo utente
 *     description: Aggiunge un nuovo utente al database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               cognome:
 *                 type: string
 *               email:
 *                 type: string
 *               capitale:
 *                 type: number
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registrazione avvenuta con successo.
 *       400:
 *         description: Errore nei dati forniti.
 *       409:
 *         description: Email già registrata.
 */

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

    if (email === 'root@root.it' && password === 'root') {
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


/**
 * @swagger
 * /list-users:
 *   get:
 *     summary: Ottiene la lista di tutti gli utenti
 *     responses:
 *       200:
 *         description: Lista di utenti
 */

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

/**
 * @swagger
 * /list-forex:
 *   get:
 *     summary: Ottiene i dati Forex
 *     responses:
 *       200:
 *         description: Lista dei dati Forex
 */

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
