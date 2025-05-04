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

// Aggiunta della nuova tabella transactions
userDb.run(`
    CREATE TABLE IF NOT EXISTS open_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        currency_pair TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
        amount REAL NOT NULL,
        entry_price REAL NOT NULL,
        open_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        close_price REAL,
        close_date DATETIME,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
`, (err) => {
    if (err) {
        console.error('Errore durante la creazione della tabella transactions:', err.message);
    } else {
        console.log('Tabella transactions creata (se non esisteva già).');
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
                open REAL,
                massimo REAL,
                minimo REAL,
                close REAL
            )
        `, (err) => {
            if (err) {
                console.error('Errore nella creazione della tabella forex:', err.message);
            } else {
                console.log('Tabella forex creata o già esistente');

                // Inserisci alcuni dati di esempio se la tabella è vuota
                forexDb.get("SELECT COUNT(*) as count FROM forex", [], (err, row) => {
                    if (err) {
                        console.error('Errore nel conteggio delle righe:', err.message);
                        return;
                    }

                    if (row.count === 0) {
                        // Inserisci dati di esempio
                        const sampleData = [
                            ['EUR/USD', '2024-01-01', 1.2345, 1.2400, 1.2300, 1.2350],
                            ['EUR/USD', '2024-01-02', 1.2350, 1.2450, 1.2320, 1.2400],
                            ['GBP/USD', '2024-01-01', 1.3450, 1.3500, 1.3400, 1.3475],
                            ['GBP/USD', '2024-01-02', 1.3475, 1.3550, 1.3440, 1.3525]
                        ];

                        const stmt = forexDb.prepare('INSERT INTO forex (valuta, giorno, open, massimo, minimo, close) VALUES (?, ?, ?, ?, ?, ?)');
                        sampleData.forEach(row => {
                            stmt.run(row, (err) => {
                                if (err) console.error('Errore nell\'inserimento dei dati:', err.message);
                            });
                        });
                        stmt.finalize();

                        console.log('Dati di esempio inseriti');
                    }
                });
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
    function (req, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }));

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        req.session.user = req.user;
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


const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        next(); // L'utente è autenticato, procedi alla prossima funzione
    } else {
        res.status(401).json({ success: false, message: 'Non autenticato' });
    }
};

// Nel server.js, modifica la parte del login così:
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Compila tutti i campi' });
    }

    // Verifica credenziali admin
    if (email === 'root@root.it' && password === 'root') {
        req.session.user = {
            id: 0,
            nome: 'Root',
            isAdmin: true
        };
        return res.json({
            success: true,
            redirect: '/indexRoot.html',
            user: { nome: 'Root', isAdmin: true }
        });
    }

    // Se non è admin, procedi con la verifica normale degli utenti
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

        req.session.user = { 
            id: user.id, 
            nome: user.nome, 
            capitale: user.capitale,
            isAdmin: false
        };

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

app.post('/api/trade', requireAuth, (req, res) => {
    const { currency_pair, type, amount, price } = req.body;
    const userId = req.session.user.id;
    
    // Log per debug
    console.log('Nuova richiesta di trading:', {
        userId,
        currency_pair,
        type,
        amount,
        price
    });

    userDb.serialize(() => {
        userDb.run('BEGIN TRANSACTION');

        // Verifica il capitale disponibile
        userDb.get(
            "SELECT capitale FROM users WHERE id = ?",
            [userId],
            (err, user) => {
                if (err) {
                    console.error('Errore nel recupero del capitale:', err);
                    userDb.run('ROLLBACK');
                    return res.status(500).json({
                        success: false,
                        message: 'Errore del server'
                    });
                }

                if (!user) {
                    userDb.run('ROLLBACK');
                    return res.status(404).json({
                        success: false,
                        message: 'Utente non trovato'
                    });
                }

                const total_cost = amount * price;
                const newBalance = type === 'buy' ? 
                    user.capitale - total_cost : 
                    user.capitale;

                if (type === 'buy' && user.capitale < total_cost) {
                    userDb.run('ROLLBACK');
                    return res.status(400).json({
                        success: false,
                        message: 'Capitale insufficiente per questa operazione'
                    });
                }

                // Inserisci la nuova posizione
                const insertPositionQuery = `
                    INSERT INTO open_positions (
                        user_id,
                        currency_pair,
                        type,
                        amount,
                        entry_price,
                        open_date,
                        status
                    ) VALUES (?, ?, ?, ?, ?, datetime('now'), 'open')
                `;

                userDb.run(
                    insertPositionQuery,
                    [userId, currency_pair, type, amount, price],
                    function(err) {
                        if (err) {
                            console.error('Errore nell\'inserimento della posizione:', err);
                            userDb.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                                message: 'Errore nell\'apertura della posizione'
                            });
                        }

                        // Aggiorna il capitale dell'utente
                        userDb.run(
                            "UPDATE users SET capitale = ? WHERE id = ?",
                            [newBalance, userId],
                            (err) => {
                                if (err) {
                                    console.error('Errore nell\'aggiornamento del capitale:', err);
                                    userDb.run('ROLLBACK');
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Errore nell\'aggiornamento del capitale'
                                    });
                                }

                                userDb.run('COMMIT');
                                console.log('Posizione aperta con successo:', {
                                    positionId: this.lastID,
                                    newBalance: newBalance
                                });

                                res.json({
                                    success: true,
                                    message: 'Posizione aperta con successo',
                                    newBalance: newBalance
                                });
                            }
                        );
                    }
                );
            }
        );
    });
});

// Endpoint per ottenere le posizioni aperte (aggiornato con più logging)
app.get('/api/positions', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    
    console.log('Richiesta posizioni per userId:', userId);

    const query = `
        SELECT op.*, u.capitale
        FROM open_positions op
        JOIN users u ON op.user_id = u.id
        WHERE op.user_id = ? 
        AND op.status = 'open'
        ORDER BY op.open_date DESC
    `;

    userDb.all(query, [userId], (err, positions) => {
        if (err) {
            console.error('Errore nel recupero delle posizioni:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle posizioni'
            });
        }

        console.log('Posizioni trovate:', positions.length);

        // Aggiorna i prezzi attuali delle posizioni
        const updatedPositions = positions.map(position => {
            // Simula una variazione di prezzo del ±0.5%
            const variation = (Math.random() - 0.5) * 0.01;
            position.current_price = position.entry_price * (1 + variation);
            return position;
        });

        res.json({
            success: true,
            positions: updatedPositions
        });
    });
});

app.get('/api/transactions', requireAuth, (req, res) => {
    const userId = req.session.user.id;

    userDb.all(
        `SELECT * FROM transactions 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT 50`,
        [userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Errore nel recupero delle transazioni'
                });
            }
            res.json({ success: true, transactions: rows });
        }
    );
});

app.get('/api/admin/user-positions/:userId', requireAuth, (req, res) => {
    // Verifica che l'utente sia admin
    if (!req.session.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Accesso non autorizzato'
        });
    }

    const userId = req.params.userId;

    const query = `
        SELECT 
            op.*,
            u.nome as user_nome,
            u.cognome as user_cognome,
            u.capitale as user_capitale
        FROM open_positions op
        JOIN users u ON op.user_id = u.id
        WHERE op.user_id = ? 
        AND op.status = 'open'
        ORDER BY op.open_date DESC
    `;

    userDb.all(query, [userId], (err, positions) => {
        if (err) {
            console.error('Errore nel recupero delle posizioni:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore nel recupero delle posizioni'
            });
        }

        // Aggiorna i prezzi attuali delle posizioni
        const updatedPositions = positions.map(position => {
            const variation = (Math.random() - 0.5) * 0.01;
            position.current_price = position.entry_price * (1 + variation);
            position.profit_loss = (position.current_price - position.entry_price) * 
                                 position.amount * 
                                 (position.type === 'buy' ? 1 : -1);
            return position;
        });

        res.json({
            success: true,
            positions: updatedPositions
        });
    });
});

const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.redirect('/index.html');
    }
};

// Proteggi la pagina admin
app.get('/indexRoot.html', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'indexRoot.html'));
});

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
app.post('/get-forex-data', (req, res) => {
    const { valuta } = req.body;
    console.log('Richiesta ricevuta per valuta:', valuta); // Log per debug

    // Controlla che la valuta sia fornita
    if (!valuta) {
        return res.status(400).json({
            success: false,
            message: 'Valuta non specificata'
        });
    }

    // Pulisci il nome della valuta (rimuovi eventuali spazi e caratteri speciali)
    const cleanValuta = valuta.replace('/', '_').trim();

    // Query al database
    forexDb.all(
        `SELECT * FROM forex 
         WHERE valuta = ? 
         ORDER BY giorno DESC 
         LIMIT 30`, // Limita a 30 giorni di dati
        [cleanValuta],
        (err, rows) => {
            if (err) {
                console.error('Errore database:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Errore nel recupero dei dati dal database'
                });
            }

            // Se non ci sono dati, genera dati di esempio
            if (rows.length === 0) {
                const datiEsempio = generaDatiEsempio(valuta);
                return res.json({
                    success: true,
                    data: datiEsempio
                });
            }

            // Altrimenti, restituisci i dati dal database
            res.json({
                success: true,
                data: rows
            });
        }
    );
});

// Funzione per generare dati di esempio
function generaDatiEsempio(valuta) {
    const dati = [];
    const oggi = new Date();
    let basePrice;

    // Imposta un prezzo base a seconda della valuta
    switch (valuta) {
        case 'EUR/USD':
            basePrice = 1.0850;
            break;
        case 'GBP/USD':
            basePrice = 1.2650;
            break;
        case 'USD/JPY':
            basePrice = 150.50;
            break;
        default:
            basePrice = 1.0000;
    }

    // Genera 30 giorni di dati
    for (let i = 0; i < 30; i++) {
        const data = new Date(oggi);
        data.setDate(data.getDate() - i);

        // Genera variazioni casuali ma realistiche
        const variazione = (Math.random() - 0.5) * 0.02; // ±1%
        const open = basePrice * (1 + variazione);
        const max = open * (1 + Math.random() * 0.01);
        const min = open * (1 - Math.random() * 0.01);
        const close = (max + min) / 2;

        dati.push({
            giorno: data.toISOString().split('T')[0],
            valuta: valuta,
            open: parseFloat(open.toFixed(4)),
            massimo: parseFloat(max.toFixed(4)),
            minimo: parseFloat(min.toFixed(4)),
            close: parseFloat(close.toFixed(4))
        });

        // Aggiorna il prezzo base per il giorno successivo
        basePrice = close;
    }

    return dati;
}


// Endpoint per ottenere i dettagli di una singola posizione
app.get('/api/position/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const positionId = req.params.id;

    const query = `
        SELECT *
        FROM open_positions
        WHERE id = ? AND user_id = ? AND status = 'open'
    `;

    userDb.get(query, [positionId, userId], (err, position) => {
        if (err) {
            console.error('Errore database:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore nel recupero della posizione'
            });
        }

        if (!position) {
            return res.status(404).json({
                success: false,
                message: 'Posizione non trovata'
            });
        }

        // Aggiorna il prezzo attuale
        position.current_price = position.entry_price * (1 + (Math.random() - 0.5) * 0.01);

        res.json({
            success: true,
            position: position
        });
    });
});

// Endpoint per chiudere una posizione
app.post('/api/position/:id/close', requireAuth, (req, res) => {
    const userId = req.session.user.id;
    const positionId = req.params.id;

    userDb.serialize(() => {
        userDb.run('BEGIN TRANSACTION');

        // Recupera i dettagli della posizione
        userDb.get(
            `SELECT * FROM open_positions 
             WHERE id = ? AND user_id = ? AND status = 'open'`,
            [positionId, userId],
            (err, position) => {
                if (err) {
                    userDb.run('ROLLBACK');
                    return res.status(500).json({
                        success: false,
                        message: 'Errore nel recupero della posizione'
                    });
                }

                if (!position) {
                    userDb.run('ROLLBACK');
                    return res.status(404).json({
                        success: false,
                        message: 'Posizione non trovata'
                    });
                }

                // Calcola il prezzo attuale e il profitto/perdita
                const currentPrice = position.entry_price * (1 + (Math.random() - 0.5) * 0.01);
                const multiplier = position.type === 'buy' ? 1 : -1;
                const profitLoss = (currentPrice - position.entry_price) * 
                                 position.amount * multiplier;

                // Aggiorna il capitale dell'utente
                userDb.run(
                    `UPDATE users 
                     SET capitale = capitale + ? 
                     WHERE id = ?`,
                    [profitLoss, userId],
                    (err) => {
                        if (err) {
                            userDb.run('ROLLBACK');
                            return res.status(500).json({
                                success: false,
                                message: 'Errore nell\'aggiornamento del capitale'
                            });
                        }

                        // Chiudi la posizione
                        userDb.run(
                            `UPDATE open_positions 
                             SET status = 'closed',
                                 close_price = ?,
                                 close_date = CURRENT_TIMESTAMP 
                             WHERE id = ?`,
                            [currentPrice, positionId],
                            (err) => {
                                if (err) {
                                    userDb.run('ROLLBACK');
                                    return res.status(500).json({
                                        success: false,
                                        message: 'Errore nella chiusura della posizione'
                                    });
                                }

                                // Recupera il nuovo saldo
                                userDb.get(
                                    'SELECT capitale FROM users WHERE id = ?',
                                    [userId],
                                    (err, user) => {
                                        if (err) {
                                            userDb.run('ROLLBACK');
                                            return res.status(500).json({
                                                success: false,
                                                message: 'Errore nel recupero del nuovo saldo'
                                            });
                                        }

                                        userDb.run('COMMIT');
                                        res.json({
                                            success: true,
                                            message: 'Posizione chiusa con successo',
                                            newBalance: user.capitale
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    });
});
app.get('/api/debug/positions-table', requireAuth, (req, res) => {
    userDb.all(`
        SELECT name, sql 
        FROM sqlite_master 
        WHERE type='table' AND name='open_positions'
    `, [], (err, tables) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Errore nel recupero della struttura della tabella',
                error: err
            });
        }

        // Recupera anche alcuni dati di esempio
        userDb.all(`
            SELECT * FROM open_positions 
            WHERE user_id = ? 
            LIMIT 5
        `, [req.session.user.id], (err, samples) => {
            res.json({
                success: true,
                tableStructure: tables,
                sampleData: samples
            });
        });
    });
});


app.get('/users', requireAuth, (req, res) => {
    // Verifica che l'utente sia admin
    if (!req.session.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Accesso non autorizzato'
        });
    }

    // Query per ottenere tutti gli utenti con le loro posizioni aperte
    const query = `
        SELECT 
            u.id,
            u.nome,
            u.cognome,
            u.email,
            u.capitale,
            COUNT(op.id) as posizioni_aperte
        FROM users u
        LEFT JOIN open_positions op ON u.id = op.user_id AND op.status = 'open'
        GROUP BY u.id, u.nome, u.cognome, u.email, u.capitale
        ORDER BY u.id ASC
    `;

    userDb.all(query, [], (err, users) => {
        if (err) {
            console.error('Errore nel recupero degli utenti:', err);
            return res.status(500).json({
                success: false,
                message: 'Errore nel recupero degli utenti'
            });
        }

        res.json({
            success: true,
            users: users
        });
    });
});


app.get('/positions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'positions.html'));
});


cron.schedule('0 0 * * *', fetchAndSaveForexRates);