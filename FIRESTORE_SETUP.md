# Configuración de Firestore

Este documento explica cómo configurar Firestore para que los clientes se creen automáticamente cuando el coach los agregue.

## Pasos para Configurar Firestore

### 1. Desplegar las Reglas de Seguridad

Las reglas de seguridad ya están configuradas en el archivo `firestore.rules`. Para desplegarlas:

```bash
firebase deploy --only firestore:rules
```

O si prefieres usar la consola de Firebase:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `coachpiperubio-db723`
3. Ve a **Firestore Database** → **Reglas**
4. Copia y pega el contenido del archivo `firestore.rules`
5. Haz clic en **Publicar**

### 2. Verificar la Estructura de la Base de Datos

La aplicación espera una colección llamada `clients` con la siguiente estructura:

```
clients/
  {userId}/
    name: string
    email: string
    phone: string (opcional)
    plan: string
    status: 'active' | 'inactive'
    createdAt: timestamp
    role: 'client'
    createdBy: string (email del admin que lo creó)
```

### 3. Reglas de Seguridad Explicadas

Las reglas permiten:

- **Lectura**: Cualquier usuario autenticado puede leer documentos de clientes
- **Creación**: 
  - Los admins (piperubiocoach@gmail.com, sebassennin@gmail.com) pueden crear cualquier cliente
  - Los clientes pueden crear su propio documento (cuando su UID coincide con el ID del documento)
- **Actualización**: 
  - Los admins pueden actualizar cualquier cliente
  - Los clientes pueden actualizar su propio documento
- **Eliminación**: Solo los admins pueden eliminar clientes

### 4. Solución al Problema de Deslogueo

Cuando el coach crea un cliente:
1. Se crea el usuario en Firebase Auth
2. Esto desloguea temporalmente al coach
3. Se guarda el documento en Firestore usando el UID del cliente recién creado
4. El cliente recién creado puede escribir porque su UID coincide con el ID del documento

**Nota**: Después de crear un cliente, el coach necesitará iniciar sesión nuevamente. Para evitar esto, se recomienda usar Cloud Functions (ya implementadas en `functions/index.js`).

### 5. Usar Cloud Functions (Recomendado)

Para evitar el deslogueo del admin, puedes usar la Cloud Function `createClient`:

1. Despliega las funciones:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

2. Modifica `AddClientModal.tsx` para usar la Cloud Function en lugar de crear el usuario directamente.

### 6. Verificar que Funciona

1. Inicia sesión como coach (piperubiocoach@gmail.com)
2. Haz clic en "Agregar Cliente"
3. Completa el formulario
4. Verifica en la consola del navegador que no hay errores
5. Verifica en Firebase Console que el documento se creó en la colección `clients`

### 7. Clientes Existentes

Si ya tienes clientes creados (ml.cc@hotmail.es, joserubio2394@gmail.com) que no aparecen:

1. Verifica en Firebase Console que existen en la colección `clients`
2. Verifica que tienen el campo `email` correcto
3. Verifica que no tienen `role: 'admin'` (deben tener `role: 'client'` o no tener el campo)
4. El código actualizado debería mostrarlos automáticamente

## Troubleshooting

### Error: "permission-denied"
- Verifica que las reglas de Firestore estén desplegadas correctamente
- Verifica que el usuario esté autenticado
- Verifica que el email del admin esté en la lista de admins en las reglas

### Los clientes no aparecen
- Abre la consola del navegador (F12) y revisa los logs
- Verifica en Firebase Console que los documentos existen
- Verifica que los documentos tengan el campo `email` correcto

### El admin se desloguea al crear un cliente
- Esto es normal con el método actual
- Para evitarlo, usa Cloud Functions (ver paso 5)

