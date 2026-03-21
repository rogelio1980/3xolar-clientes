#!/usr/bin/env node
/**
 * Migración de datos al modelo v2
 * 
 * Ejecutar desde Cloud Shell de Firebase:
 *   cd 3xolar-clientes
 *   npm install firebase-admin
 *   node scripts/migrate-to-v2.js
 * 
 * O con credenciales locales:
 *   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
 *   node scripts/migrate-to-v2.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'xolar-clientes'
  });
}

const db = admin.firestore();

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  MIGRACIÓN AL MODELO V2 - Portal TRN');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // ─────────────────────────────────────────────────────────────────────
  // PASO 1: Obtener datos del modelo v1
  // ─────────────────────────────────────────────────────────────────────
  console.log('📊 Paso 1: Analizando datos del modelo v1...');
  
  const clientsSnap = await db.collection('clients').get();
  const allProposals = [];
  const allQuotes = [];
  const clientMap = {};
  
  for (const clientDoc of clientsSnap.docs) {
    const clientId = clientDoc.id;
    const clientData = clientDoc.data();
    clientMap[clientId] = clientData;
    
    const propsSnap = await clientDoc.ref.collection('proposals').get();
    
    propsSnap.forEach(doc => {
      const d = doc.data();
      // Distinguir entre propuestas y cotizaciones
      if (d.folio && d.items && Array.isArray(d.items)) {
        allQuotes.push({ id: doc.id, clientId, ...d });
      } else if (d.versions && d.versions.length > 0) {
        allProposals.push({ id: doc.id, clientId, ...d });
      }
    });
  }
  
  console.log(`   ✓ ${clientsSnap.size} clientes encontrados`);
  console.log(`   ✓ ${allProposals.length} propuestas encontradas`);
  console.log(`   ✓ ${allQuotes.length} cotizaciones encontradas`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────────
  // PASO 2: Consolidar propuestas duplicadas
  // ─────────────────────────────────────────────────────────────────────
  console.log('🔄 Paso 2: Consolidando propuestas duplicadas...');
  
  const proposalGroups = {};
  
  for (const p of allProposals) {
    const versions = p.versions || [];
    // Usar URL de la primera versión como clave única
    const key = versions[0]?.url || versions[0]?.path || p.title || p.id;
    
    if (!proposalGroups[key]) {
      proposalGroups[key] = {
        proposal: p,
        clientIds: [],
        allVersions: versions
      };
    }
    
    if (!proposalGroups[key].clientIds.includes(p.clientId)) {
      proposalGroups[key].clientIds.push(p.clientId);
    }
    
    // Mantener las versiones más completas
    if (versions.length > proposalGroups[key].allVersions.length) {
      proposalGroups[key].allVersions = versions;
      proposalGroups[key].proposal = p;
    }
  }
  
  const uniqueProposals = Object.values(proposalGroups);
  console.log(`   ✓ Consolidadas a ${uniqueProposals.length} propuestas únicas`);
  console.log('');

  // ─────────────────────────────────────────────────────────────────────
  // PASO 3: Crear propuestas en modelo v2 (proposals/)
  // ─────────────────────────────────────────────────────────────────────
  console.log('📝 Paso 3: Creando propuestas en modelo v2...');
  
  const proposalIdMap = {}; // path -> nuevo ID
  
  for (const group of uniqueProposals) {
    const p = group.proposal;
    const versions = group.allVersions;
    const pathKey = versions[0]?.url || p.title;
    
    // Determinar companyId desde el path
    const pathParts = (pathKey || '').split('/').filter(Boolean);
    const companyId = pathParts[0] || 'unknown';
    
    // Crear documento de propuesta
    const newProposalRef = db.collection('proposals').doc();
    const newProposalData = {
      title: p.title || 'Sin título',
      description: p.description || '',
      status: p.status || 'draft',
      clientIds: group.clientIds,
      companyId: companyId,
      currentVersion: versions.length || 0,
      tags: p.tags || [],
      quoteData: p.quoteData || null,
      createdAt: p.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedFrom: 'v1',
      originalPath: pathKey
    };
    
    await newProposalRef.set(newProposalData);
    proposalIdMap[pathKey] = newProposalRef.id;
    
    // Crear versiones como subcolección
    for (let i = 0; i < versions.length; i++) {
      const v = versions[i];
      const versionRef = newProposalRef.collection('versions').doc(String(i + 1));
      await versionRef.set({
        versionNum: i + 1,
        path: v.url || v.path || '',
        title: v.label || `Versión ${i + 1}`,
        notes: v.changelog || '',
        date: v.date || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`   ✓ Propuesta: ${p.title} (${versions.length} versiones, ${group.clientIds.length} clientes)`);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────────
  // PASO 4: Consolidar y crear cotizaciones en modelo v2 (quotes/)
  // ─────────────────────────────────────────────────────────────────────
  console.log('💰 Paso 4: Creando cotizaciones en modelo v2...');
  
  // Deduplicar cotizaciones por folio
  const uniqueQuotes = {};
  
  for (const q of allQuotes) {
    const folio = q.folio || q.id;
    if (!uniqueQuotes[folio]) {
      uniqueQuotes[folio] = { quote: q, clientIds: [] };
    }
    if (!uniqueQuotes[folio].clientIds.includes(q.clientId)) {
      uniqueQuotes[folio].clientIds.push(q.clientId);
    }
  }
  
  for (const [folio, qGroup] of Object.entries(uniqueQuotes)) {
    const q = qGroup.quote;
    
    // Intentar vincular con propuesta
    let proposalId = null;
    let proposalVersion = 1;
    
    // Buscar propuesta por título similar
    for (const [path, propId] of Object.entries(proposalIdMap)) {
      if (q.title && path.toLowerCase().includes('solar')) {
        proposalId = propId;
        proposalVersion = 3; // Asumir última versión
        break;
      }
    }
    
    const newQuoteRef = db.collection('quotes').doc();
    const newQuoteData = {
      folio: q.folio || '',
      proposalId: proposalId,
      proposalVersion: proposalVersion,
      clientIds: qGroup.clientIds,
      companyId: q.empresa ? q.empresa.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30) : '',
      status: q.status || 'draft',
      total: q.total || 0,
      subtotal: q.subtotal || 0,
      iva: q.iva || 0,
      moneda: q.moneda || 'MXN',
      items: q.items || [],
      contacto: q.contacto || '',
      empresa: q.empresa || '',
      elaboradoPor: q.elaboradoPor || '',
      fechaCot: q.fechaCot || '',
      lugar: q.lugar || '',
      formaPago: q.formaPago || '',
      tiempoEntrega: q.tiempoEntrega || '',
      vigencia: q.vigencia || 30,
      notas: q.notas || '',
      config: q.config || {},
      margenResumen: q.margenResumen || null,
      createdAt: q.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedFrom: 'v1'
    };
    
    await newQuoteRef.set(newQuoteData);
    console.log(`   ✓ Cotización: ${folio} (${qGroup.clientIds.length} clientes)`);
  }
  console.log('');

  // ─────────────────────────────────────────────────────────────────────
  // RESUMEN
  // ─────────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  ✅ MIGRACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Resumen:');
  console.log(`   • ${uniqueProposals.length} propuestas migradas a proposals/`);
  console.log(`   • ${Object.keys(uniqueQuotes).length} cotizaciones migradas a quotes/`);
  console.log('');
  console.log('⚠️  IMPORTANTE: Crear índices en Firebase Console:');
  console.log('   • proposals: clientIds (array-contains) + updatedAt (desc)');
  console.log('   • quotes: clientIds (array-contains) + createdAt (desc)');
  console.log('');
  console.log('📝 Los datos del modelo v1 NO fueron eliminados.');
  console.log('   Puedes eliminarlos manualmente después de verificar la migración.');
  console.log('');
}

migrate().catch(err => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});
