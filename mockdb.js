const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const userDbPath = path.resolve(__dirname, 'database/database-user-mk.db');
const forexDbPath = path.resolve(__dirname, 'database/database-forex-mk.db');

const userDb = new sqlite3.Database(userDbPath, (err) => {
    if (err) {
        console.error('Errore durante la connessione al database utenti:', err.message);
    } else {
        console.log('Connesso al database utenti SQLite.');

        userDb.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                capitale REAL NOT NULL,
                password TEXT NOT NULL
            )
        `, (err) => {
            if (err) {
                console.error('Errore durante la creazione della tabella utenti:', err.message);
            } else {
                console.log('Tabella utenti creata (se non esisteva già).');
            }
        });
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
