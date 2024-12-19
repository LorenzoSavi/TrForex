
document.addEventListener('DOMContentLoaded', function () {
    // Assicurati che gli input e il bottone siano disponibili nel DOM
    const loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', login);
});

document.addEventListener("DOMContentLoaded", () => {
    fetch('/list-forex')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.querySelector('#forex-table tbody');
                data.forexData.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row.valuta}</td>
                        <td>${row.giorno}</td>
                        <td>${row.massimo}</td>
                        <td>${row.minimo}</td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                console.error('Errore nel recupero dei dati Forex:', data.message);
            }
        })
        .catch(error => console.error('Errore nella richiesta:', error));
});

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Per favore, compila tutti i campi.');
        return;
    }

    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const { nome, capitale } = data.user; // Assumi che il server restituisca nome e capitale
            localStorage.setItem('nome', nome);
            localStorage.setItem('capitale', capitale);

            if (email === 'root@root.it' && password === 'root') {
                window.location.href = '/indexRoot.html';
            } else {
                window.location.href = '/forex.html';
            }
        } else {
            alert(data.message || 'Errore durante il login.');
        }
    })
    .catch(err => {
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
