const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Cloud Function para crear clientes sin desloguear al admin
exports.createClient = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado y sea admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const adminEmails = ['sebassennin@gmail.com', 'piperubiocoach@gmail.com'];
  const userEmail = context.auth.token.email;
  
  if (!adminEmails.includes(userEmail.toLowerCase())) {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden crear clientes');
  }

  const { name, email, phone, plan, password } = data;

  if (!name || !email || !plan) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
  }

  try {
    // Usar contraseña personalizada o generar una temporal
    let passwordToUse;
    if (password && password.length >= 6) {
      passwordToUse = password;
    } else {
      // Generar contraseña temporal
      passwordToUse = Math.random().toString(36).slice(-12) + 
                      Math.random().toString(36).slice(-12).toUpperCase() + '123!';
    }

    // Crear usuario con Admin SDK (no desloguea al admin)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: passwordToUse,
      emailVerified: false,
    });

    // Guardar información del cliente en Firestore
    const db = admin.firestore();
    await db.collection('clients').doc(userRecord.uid).set({
      name: name,
      email: email,
      phone: phone || '',
      plan: plan,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'client',
      createdBy: userEmail,
    });

    // Enviar email de restablecimiento de contraseña solo si se generó automática
    if (!password || password.length < 6) {
      const resetLink = await admin.auth().generatePasswordResetLink(email);
      // Aquí puedes enviar el email usando un servicio de email o Firebase Extensions
    }

    return {
      success: true,
      userId: userRecord.uid,
      message: 'Cliente creado exitosamente',
    };
  } catch (error) {
    console.error('Error creating client:', error);
    // Proporcionar más detalles del error
    const errorMessage = error.message || 'Error desconocido';
    const errorCode = error.code || 'unknown';
    console.error('Error details:', { code: errorCode, message: errorMessage, stack: error.stack });
    
    // Si es un error de email duplicado, lanzar error específico
    if (errorCode === 'auth/email-already-exists' || errorMessage.includes('email already exists')) {
      throw new functions.https.HttpsError('already-exists', 'El email ya está registrado');
    }
    
    throw new functions.https.HttpsError('internal', `Error al crear cliente: ${errorMessage}`);
  }
});

// Cloud Function para eliminar clientes
exports.deleteClient = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado y sea admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const adminEmails = ['sebassennin@gmail.com', 'piperubiocoach@gmail.com'];
  const userEmail = context.auth.token.email;
  
  if (!adminEmails.includes(userEmail.toLowerCase())) {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden eliminar clientes');
  }

  const { clientId, clientEmail } = data;

  if (!clientId) {
    throw new functions.https.HttpsError('invalid-argument', 'ID de cliente requerido');
  }

  try {
    // Eliminar usuario de Firebase Auth
    if (clientEmail) {
      try {
        const userRecord = await admin.auth().getUserByEmail(clientEmail);
        await admin.auth().deleteUser(userRecord.uid);
      } catch (authError) {
        console.warn('Error eliminando usuario de Auth:', authError);
        // Continuar aunque falle, para eliminar de Firestore
      }
    }

    // Eliminar documento de Firestore
    const db = admin.firestore();
    await db.collection('clients').doc(clientId).delete();

    return {
      success: true,
      message: 'Cliente eliminado exitosamente',
    };
  } catch (error) {
    console.error('Error deleting client:', error);
    throw new functions.https.HttpsError('internal', 'Error al eliminar cliente: ' + error.message);
  }
});
