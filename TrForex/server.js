const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Connessione ai database
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

        // Creazione della tabella "forex" se non esiste
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

// Middleware per il parsing del body
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Servire file statici
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint per la registrazione
app.post('/register', (req, res) => {
    const { nome, cognome, email, capitale, password } = req.body;

    // Validazione dei dati
    if (!nome || !cognome || !email || !capitale || !password) {
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    // Inserimento dei dati nel database degli utenti
    const query = "INSERT INTO users (nome, cognome, email, capitale, password) VALUES (?, ?, ?, ?, ?)";
    userDb.run(query, [nome, cognome, email, capitale, password], (err) => {
        if (err) {
            console.error('Errore durante l\'inserimento nel database utenti:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        } else {
            return res.json({ success: true, message: 'Registrazione avvenuta con successo!' });
        }
    });
});

// Endpoint per ottenere i dati Forex
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

        // Trasforma i dati in un formato utile per il grafico a candele
        const formattedData = rows.map(row => ({
            giorno: row.giorno,  // data
            open: row.open,    // valore di apertura
            massimo: row.massimo, // massimo
            minimo: row.minimo,  // minimo
            close: row.close    // valore di chiusura
        }));

        res.json({ success: true, data: formattedData });
    });
});


// Endpoint per il login
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
        res.json({ success: true, user: { nome: user.nome, capitale: user.capitale } });
    });
});

// Endpoint per ottenere i dati dell'utente dopo il login
app.post('/get-user-data', (req, res) => {
    const { email } = req.body;

    // Query per ottenere i dati dell'utente
    const query = "SELECT nome, capitale FROM users WHERE email = ?";
    userDb.get(query, [email], (err, user) => {
        if (err) {
            console.error('Errore durante la query per i dati utente:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato' });
        }

        res.json({ success: true, nome: user.nome, capitale: user.capitale });
    });
});

// Reindirizzamento a forex.html dopo il login
app.get('/forex', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'forex.html'));
});

app.listen(PORT, () => {
    console.log(`Server in esecuzione --> http://localhost:${PORT}`);
});
