require('dotenv').config(); // Carica variabili dal file .env
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

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

const API_KEY = process.env.FOREX_API_KEY; // Legge la chiave API dal file .env
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

fetchAndSaveForexRates();
