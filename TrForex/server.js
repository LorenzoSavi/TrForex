const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Percorso del database
const dbPath = path.resolve(__dirname, 'database-user.db');

// Connessione al database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Errore durante la connessione al database:', err.message);
    } else {
        console.log('Connesso al database SQLite.');
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
        console.log("Dati mancanti nella richiesta di registrazione:", req.body);
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    // Inserimento dei dati nel database
    const query = "INSERT INTO users (nome, cognome, email, capitale, password) VALUES (?, ?, ?, ?, ?)";
    db.run(query, [nome, cognome, email, capitale, password], (err) => {
        if (err) {
            console.error('Errore durante l\'inserimento nel database:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        } else {
            console.log("Registrazione riuscita per:", email);
            
            return res.json({ success: true, message: 'Registrazione avvenuta con successo!' });

        }
    });
});

// Endpoint per il login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // Validazione dei dati
    if (!email || !password) {
        console.log("Dati mancanti nella richiesta di login:", req.body);
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    // Controllo delle credenziali nel database
    const query = "SELECT * FROM users WHERE email = ? AND password = ?";
    db.get(query, [email, password], (err, user) => {
        if (err) {
            console.error('Errore durante la query di login:', err.message);
            return res.status(500).json({ success: false, message: 'Errore del server' });
        }
        if (!user) {
            console.log("Login fallito per:", email);
            return res.status(401).json({ success: false, message: 'Email o password non validi' });
        }

        console.log("Login riuscito per:", email);
        res.json({ success: true, user: { nome: user.nome, capitale: user.capitale } });
    });
});

app.post('/get-user-data', (req, res) => {
    const { email } = req.body;

    // Query per ottenere i dati dell'utente
    const query = "SELECT nome, capitale FROM users WHERE email = ?";
    db.get(query, [email], (err, user) => {
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
