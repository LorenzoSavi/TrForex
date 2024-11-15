const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

const app = express();
const PORT = 3000;

const userDbPath = path.resolve(__dirname, 'database-user.db');
const forexDbPath = path.resolve(__dirname, 'database-forex.db');

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




app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

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

        // Reindirizza al frontend con i dati utente
        res.json({
            success: true,
            user: { nome: user.nome, capitale: user.capitale },
            redirect: '/forex' // Reindirizzamento alla pagina forex
        });
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

    // Decodifica del parametro
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
});




app.get('/forex', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forex.html'));
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione --> http://localhost:${PORT}`);
});
