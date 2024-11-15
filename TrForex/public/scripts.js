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

    if (!email || !password) {
        alert('Per favore, inserisci email e password');
        return;
    }

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Salva i dati nel localStorage
            localStorage.setItem('nome', data.user.nome);
            localStorage.setItem('capitale', data.user.capitale);

            // Reindirizza alla pagina forex.html
            window.location.href = data.redirect;
        } else {
            alert(data.message); // Mostra il messaggio di errore
        }
    })
    .catch(err => {
        console.error('Errore durante il login:', err);
        alert('Errore durante il login');
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
