document.addEventListener('DOMContentLoaded', function () {
    const loginButton = document.getElementById('loginButton');
    loginButton.onclick = login;
});

document.addEventListener('DOMContentLoaded', function () {
    // Assicurati che gli input e il bottone siano disponibili nel DOM
    const loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', login);
});

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Controlla se i campi sono vuoti
    if (!email || !password) {
        alert('Per favore, compila tutti i campi.');
        return;
    }

    // Invio dei dati al server
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (email === 'root@root.it' && password === 'root') {
                // Reindirizzamento alla pagina admin
                window.location.href = '/indexRoot.html';
            } else {
                // Reindirizzamento alla pagina forex
                window.location.href = '/forex.html';
            }
        } else {
            // Gestione errore dal server
            alert(data.message || 'Errore durante il login.');
        }
    })
    .catch(err => {
        // Log dell'errore per il debug
        console.error('Errore durante il login:', err);
    });
}



function register() {
    const nome = document.getElementById('nome').value;
    const cognome = document.getElementById('cognome').value;
    const email = document.getElementById('email-register').value;
    const capitale = document.getElementById('capitale').value;
    const password = document.getElementById('password-register').value;

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cognome, email, capitale, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Registrazione avvenuta con successo');
            showLogin();
        } else {
            alert('Errore durante la registrazione');
        }
    });
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}
