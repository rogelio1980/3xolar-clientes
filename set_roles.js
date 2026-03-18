const { initializeApp } = require('firebase-admin/app');
const { getFirestore }   = require('firebase-admin/firestore');
initializeApp({ projectId: 'xolar-clientes' });
const db = getFirestore();

const USERS = [
  { uid: 'WR0JeEokioRja4MNetd3KeMV0Oj2', name: 'Rogelio Guerra',   email: 'rogelio@ittelecom.com.mx',    role: 'superadmin' },
  { uid: '0RtKXpsNVgMrT1cpUkv0ictNzZU2', name: 'José Luis Arellanes', email: 'arellanes@ittelecom.com.mx', role: 'admin' },
  { uid: 'UxOqWcqQCFTwV5MFw3y7rt2xt6Z2', name: 'Sergio Moreno',    email: 'smoreno@coeur.com.mx',        role: 'client'     },
  { uid: '8xOCvZHZJcO0aEbVplwjFuFz1lr1', name: 'Rafael Carrillo',  email: 'rcarrillo@coeur.com.mx',      role: 'client'     },
];

async function run() {
  for (const u of USERS) {
    await db.collection('users').doc(u.uid).set(
      { name: u.name, email: u.email, role: u.role },
      { merge: true }
    );
    console.log('✅', u.role.padEnd(12), u.name);
  }
  console.log('\nDone. 4 usuarios configurados.');
  process.exit(0);
}
run().catch(e => { console.error('❌', e.message); process.exit(1); });
