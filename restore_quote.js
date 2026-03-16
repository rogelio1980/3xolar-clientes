const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: 'xolar-clientes' });
const db = getFirestore();
const CID = '8xOCvZHZJcO0aEbVplwjFuFz1lr1';

const items = [
  { tipo:'texto', desc:'--- PARTIDA 1: Equipos Solares ---', esEncabezado:true },
  { tipo:'producto', desc:'Panel Solar Fotovoltaico 340W PERC Monocristalino', qty:2, price:2155.17, disc:0, total:4310.34 },
  { tipo:'producto', desc:'Controlador de Carga MPPT 40A 12/24V con monitoreo remoto', qty:1, price:1948.28, disc:0, total:1948.28 },
  { tipo:'producto', desc:'Bateria de Respaldo 12V 200Ah Ciclo Profundo', qty:1, price:4741.38, disc:0, total:4741.38 },
  { tipo:'producto', desc:'Inyector PoE Industrial DC 10-57V 90W', qty:2, price:1213.79, disc:0, total:2427.58 },
  { tipo:'producto', desc:'Modulo WiFi Monitoreo Remoto para Controlador', qty:1, price:603.45, disc:0, total:603.45 },
  { tipo:'producto', desc:'Cable de Programacion USB-RS485 para Controlador', qty:1, price:77.59, disc:0, total:77.59 },
  { tipo:'producto', desc:'Conectores de Conexion Panel Solar MC-4 par', qty:2, price:34.48, disc:0, total:68.96 },
  { tipo:'producto', desc:'Kit Cableado Solar y Protecciones DC', qty:1, price:776.72, disc:0, total:776.72 },
  { tipo:'texto', desc:'--- PARTIDA 2: Herreria y Montaje en Poste ---', esEncabezado:true },
  { tipo:'producto', desc:'Soporte de Montaje Panel Solar en Poste 4-7 pulgadas estructura galvanizada', qty:2, price:2672.41, disc:0, total:5344.82 },
  { tipo:'producto', desc:'Gabinete de Intemperie para Montaje en Poste 700mm', qty:1, price:1940.52, disc:0, total:1940.52 },
  { tipo:'producto', desc:'Accesorio de Montaje Gabinete-Poste soporte galvanizado', qty:1, price:555.17, disc:0, total:555.17 },
  { tipo:'producto', desc:'Estructura Metalica Galvanizada Soldadura y Pintura Anticorrosiva', qty:1, price:603.45, disc:0, total:603.45 },
  { tipo:'producto', desc:'Tornilleria Abrazaderas Sellador y Miscelanea de Instalacion', qty:1, price:172.41, disc:0, total:172.41 },
  { tipo:'texto', desc:'--- PARTIDA 3: Mano de Obra ---', esEncabezado:true },
  { tipo:'mo', desc:'Instalacion sistema solar completo en poste programacion configuracion WiFi y pruebas', moFields:{ tecnicos:2, dias:5 }, total:19395.00 },
  { tipo:'texto', desc:'--- PARTIDA 4: Viaticos Chihuahua a Palmarejo 417km ---', esEncabezado:true },
  { tipo:'viatico', desc:'Hospedaje y alimentacion del equipo tecnico en sitio', viaFields:{ concepto:'Hospedaje', cantidad:5, costoUnit:3000 }, total:15000.00 },
  { tipo:'viatico', desc:'Combustible traslado Chihuahua Palmarejo 950km total', viaFields:{ concepto:'Gasolina', cantidad:95, costoUnit:26 }, total:2470.00 },
  { tipo:'viatico', desc:'Casetas de peaje ida y vuelta', viaFields:{ concepto:'Otro', cantidad:1, costoUnit:300 }, total:300.00 }
];

const quoteDoc = {
  _type: 'quote',
  folio: 'TRN-2026-PMA-001',
  title: 'Sistema Solar Autonomo 12V - Alimentacion de Radios Mimosa en Poste',
  description: 'Suministro e instalacion de sistema solar fotovoltaico autonomo de 12V para alimentacion continua de equipo de telecomunicaciones Mimosa en sitio remoto.',
  empresa: 'Coeur Mexicana S.A. de C.V.',
  contacto: 'Rafael Carrillo',
  fechaCot: '2026-03-16',
  lugar: 'Palmarejo, Chinipas, Chihuahua',
  tiempoEntrega: '5 dias habiles',
  vigencia: 30,
  formaPago: '50% anticipo, 50% contra entrega',
  incluye: 'si',
  moneda: 'MXN',
  ivaRate: 16,
  subtotal: 60735.67,
  iva: 9717.71,
  total: 70453.38,
  garantiaDesc: 'Los equipos cuentan con garantia segun las condiciones del fabricante. Los paneles solares tienen garantia de producto de 12 anios y garantia de rendimiento lineal de 25 anios. El controlador de carga y modulos de comunicacion tienen garantia de 2 anios. TRN garantiza los trabajos de instalacion por un periodo de 6 meses a partir de la fecha de entrega.',
  notas: 'Precios incluyen traslado e instalacion en sitio. Viaticos calculados sobre 417km de distancia Chihuahua-Palmarejo. Precios sujetos a disponibilidad de inventario al momento de la orden de compra.',
  elaboradoPor: 'Dahana Vargas Vega',
  status: 'review',
  versions: [],
  config: { showDisc: true, showSubtotals: true },
  updatedAt: FieldValue.serverTimestamp(),
  items
};

async function main() {
  const ref = await db.collection('clients').doc(CID).collection('proposals').add(quoteDoc);
  console.log('CREATED:', ref.id);

  await db.collection('clients').doc(CID).collection('proposals').doc('solar-poste').update({
    quoteId: ref.id,
    quoteData: {
      folio: quoteDoc.folio,
      total: quoteDoc.total,
      subtotal: quoteDoc.subtotal,
      iva: quoteDoc.iva,
      moneda: quoteDoc.moneda,
      empresa: quoteDoc.empresa,
      contacto: quoteDoc.contacto,
      status: quoteDoc.status
    },
    updatedAt: FieldValue.serverTimestamp()
  });
  console.log('UPDATED solar-poste with quoteId:', ref.id);
  process.exit(0);
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
