
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




/**
 * @swagger
 * /list-users:
 *   get:
 *     summary: Ottiene la lista di tutti gli utenti
 *     responses:
 *       200:
 *         description: Lista di utenti
 */

/**
 * @swagger
 * /users/filtered:
 *   get:
 *     summary: Ottiene una lista filtrata di utenti con capitale maggiore di 4500
 *     responses:
 *       200:
 *         description: Lista di utenti filtrata
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   nome:
 *                     type: string
 *                     example: Lorenzo
 *                   capitale:
 *                     type: number
 *                     example: 5000
 */
/**
 * @swagger
 * /list-forex:
 *   get:
 *     summary: Ottiene i dati Forex
 *     responses:
 *       200:
 *         description: Lista dei dati Forex
 */



