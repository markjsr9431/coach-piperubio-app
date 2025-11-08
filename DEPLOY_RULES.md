# Desplegar Reglas de Firestore

## ⚠️ Error: "Missing or insufficient permissions"

Si ves este error al intentar guardar entrenamientos, significa que las reglas de Firestore no están desplegadas o no están actualizadas.

## Solución Rápida

### Opción 1: Firebase CLI (Más rápido)

1. Abre una terminal en la carpeta del proyecto
2. Ejecuta:
```bash
firebase deploy --only firestore:rules
```

3. Espera a que termine el despliegue
4. Recarga la aplicación y prueba de nuevo

### Opción 2: Consola de Firebase (Sin CLI)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: `coachpiperubio-db723`
3. En el menú lateral, ve a **Firestore Database**
4. Haz clic en la pestaña **Reglas**
5. Abre el archivo `firestore.rules` en tu proyecto
6. Copia TODO el contenido del archivo
7. Pégalo en el editor de reglas de Firebase
8. Haz clic en **Publicar**
9. Espera unos segundos
10. Recarga la aplicación y prueba de nuevo

## Verificar que funcionó

1. Inicia sesión como coach (piperubiocoach@gmail.com o sebassennin@gmail.com)
2. Ve a un cliente
3. Haz clic en "Editar" en un día de entrenamiento
4. Haz algunos cambios
5. Haz clic en "Guardar Cambios"
6. Si no aparece el error, ¡funcionó! ✅

## Reglas Actuales

Las reglas permiten:
- **Lectura**: Cualquier usuario autenticado puede leer entrenamientos
- **Escritura**: Solo los administradores (piperubiocoach@gmail.com, sebassennin@gmail.com) pueden crear/editar/eliminar entrenamientos

## Notas

- Las reglas se aplican inmediatamente después del despliegue
- Si cambias las reglas, debes desplegarlas nuevamente
- El email del usuario debe coincidir exactamente (Firebase Auth normaliza los emails a minúsculas)

