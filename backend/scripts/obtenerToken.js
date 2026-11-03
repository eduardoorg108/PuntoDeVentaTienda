import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });
const correo = process.env.ADMIN_EMAIL;
const password = await rl.question(`Contraseña de ${correo}: `);
rl.close();

const respuesta = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: correo, password, returnSecureToken: true }),
  }
);

const datos = await respuesta.json();
if (!respuesta.ok) {
  console.error('Error:', datos.error?.message);
  process.exit(1);
}

console.log('\nTOKEN (dura 1 hora):\n');
console.log(datos.idToken);