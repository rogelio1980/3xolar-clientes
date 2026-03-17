const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: 'xolar-clientes' });
const db = getFirestore();

const CID = '8xOCvZHZJcO0aEbVplwjFuFz1lr1';
const PROPOSAL_ID = 'solar-poste';

async function main() {
  const ref = db.collection('clients').doc(CID).collection('proposals').doc(PROPOSAL_ID);
  const snap = await ref.get();
  if (!snap.exists) { console.log('solar-poste not found'); return; }
  
  const d = snap.data();
  console.log('Current versions:', JSON.stringify(d.versions?.map(v=>({label:v.label, url:v.url})), null, 2));
  
  // Fix versions with correct clean URLs (no .html, correct v3 path)
  const fixedVersions = [
    {
      label: 'v1',
      changelog: 'Diseño inicial — DC 48V, panel 710W Bifacial TOPCon + batería PYTES EBOX48100R 5.12kWh + controlador MPPT XTRA-4415-N',
      date: '2026-03-15',
      url: '/coeur-mexicana/solar-poste-v1'
    },
    {
      label: 'v2', 
      changelog: 'Panel optimizado — 2x EPCOM EPL34024AL 340W PERC, facilita maniobra e instalación en poste de madera',
      date: '2026-03-15',
      url: '/coeur-mexicana/solar-poste-v2'
    },
    {
      label: 'v3',
      changelog: 'Arquitectura 12V — Batería LI280A12PRO 280Ah + Inversor IP-350-11 280W + TRACER-6415-AN 60A. Mimosas con PoE propio desde 120VAC. Sin inyectores independientes.',
      date: '2026-03-15',
      url: '/coeur-mexicana/solar-poste-v3'
    }
  ];
  
  await ref.update({ versions: fixedVersions });
  console.log('✅ Versions fixed with correct URLs');
  
  // Now find the quote doc and ensure it's classified correctly
  const quotesSnap = await db.collection('clients').doc(CID).collection('proposals').get();
  for (const doc of quotesSnap.docs) {
    const data = doc.data();
    if (data.folio && data.items && data.items.length > 0) {
      console.log('Found quote doc:', doc.id, 'folio:', data.folio, 'items:', data.items.length, 'total:', data.total);
      // Ensure _type is set correctly
      if (data._type !== 'quote') {
        await doc.ref.update({ _type: 'quote' });
        console.log('✅ Set _type=quote on', doc.id);
      }
    }
  }
  
  console.log('Done.');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
