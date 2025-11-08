# Configuración de Cloud Functions

Para que el sistema funcione correctamente y el admin no se desloguee al crear clientes, necesitas desplegar la Cloud Function.

## Pasos para desplegar:

1. **Instalar Firebase CLI** (si no lo tienes):
   ```bash
   npm install -g firebase-tools
   ```

2. **Iniciar sesión en Firebase**:
   ```bash
   firebase login
   ```

3. **Asegúrate de estar en el directorio raíz del proyecto** (donde está `firebase.json`):
   ```bash
   cd C:\Users\markjsr\coach-piperubio\coach-piperubio
   ```

4. **Instalar dependencias de Functions**:
   ```bash
   cd functions
   npm install
   cd ..
   ```

5. **Desplegar la función** (desde el directorio raíz):
   ```bash
   firebase deploy --only functions
   ```

## Nota importante:

- La Cloud Function usa Firebase Admin SDK, que permite crear usuarios sin desloguear al admin actual
- Asegúrate de que tu proyecto Firebase tenga habilitado Cloud Functions
- La función verifica que solo los administradores puedan crear clientes

## Si no puedes desplegar la función:

El sistema seguirá funcionando, pero el admin se deslogueará temporalmente al crear un cliente. Esto es una limitación de Firebase Auth en el frontend.

