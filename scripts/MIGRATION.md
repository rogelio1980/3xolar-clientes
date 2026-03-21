# Migración al Modelo v2 - Portal TRN

## Resumen del cambio

| Aspecto | Modelo v1 (actual) | Modelo v2 (nuevo) |
|---------|-------------------|-------------------|
| Propuestas | `clients/{uid}/proposals/{id}` | `proposals/{id}` con `clientIds[]` |
| Cotizaciones | Mezcladas en proposals | `quotes/{id}` con `clientIds[]` |
| Duplicación | Una copia por cliente | Una propuesta, múltiples clientes |

## Pasos para migrar

### 1. Desplegar reglas de Firestore (manual)

```bash
# Desde Cloud Shell de Firebase o terminal local con gcloud autenticado
firebase deploy --only firestore:rules --project xolar-clientes
```

### 2. Desplegar índices de Firestore

```bash
firebase deploy --only firestore:indexes --project xolar-clientes
```

### 3. Ejecutar script de migración

```bash
# Instalar dependencia
npm install firebase-admin

# Ejecutar migración
node scripts/migrate-to-v2.js
```

### 4. Verificar migración

1. Acceder al portal como cliente (Sergio o Rafael)
2. Verificar que las propuestas aparezcan correctamente
3. Verificar que las cotizaciones aparezcan

### 5. (Opcional) Limpiar datos v1

Una vez verificado, puedes eliminar los datos duplicados del modelo v1:

```javascript
// Desde Firebase Console > Firestore
// Eliminar subcolecciones clients/{uid}/proposals
```

## Estructura del nuevo modelo

### proposals/{proposalId}
```json
{
  "title": "Sistema Solar Autónomo",
  "clientIds": ["uid1", "uid2"],
  "companyId": "coeur-mexicana",
  "status": "review",
  "currentVersion": 3,
  "tags": ["Solar 12V", "Mimosa"],
  "quoteData": { "folio": "TRN-2026-PMA-001", "total": 70453.38 }
}
```

### proposals/{id}/versions/{vNum}
```json
{
  "versionNum": 1,
  "path": "/coeur-mexicana/solar-poste-v1",
  "title": "v1",
  "notes": "Diseño inicial — DC 48V",
  "date": "2026-03-15"
}
```

### quotes/{quoteId}
```json
{
  "folio": "TRN-2026-PMA-001",
  "proposalId": "abc123",
  "proposalVersion": 3,
  "clientIds": ["uid1", "uid2"],
  "status": "review",
  "total": 70453.38,
  "items": [...]
}
```

## Índices requeridos

| Colección | Campos | Orden |
|-----------|--------|-------|
| proposals | clientIds (array-contains) + updatedAt | DESC |
| quotes | clientIds (array-contains) + createdAt | DESC |
