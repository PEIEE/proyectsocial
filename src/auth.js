import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from './firebase';

export async function registerUser(email, password, username) {
  try {
    console.log('Creando usuario con Firebase Authentication');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Actualizando perfil del usuario con nombre:', username);
    await updateProfile(user, { displayName: username });

    console.log('Guardando datos del usuario en Realtime Database:', user.uid);
    await set(ref(db, 'users/' + user.uid), {
      username,
      email,
      avatar: '/assets/default-avatar.png',
      status: 'offline'
    });

    return user;
  } catch (error) {
    console.error('Error en registerUser:', error.code, error.message);
    throw error;
  }
}

export async function loginUser(email, password) {
  try {
    console.log('Iniciando sesión con Firebase Authentication');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error en loginUser:', error.code, error.message);
    throw error;
  }
}

export async function updateAvatar(userId, avatarUrl) {
  try {
    console.log('Actualizando avatar en Realtime Database:', userId);
    if (!avatarUrl.startsWith('http')) {
      throw new Error('La URL del avatar debe comenzar con http o https');
    }
    await set(ref(db, `users/${userId}/avatar`), avatarUrl);
    return avatarUrl;
  } catch (error) {
    console.error('Error en updateAvatar:', error.message);
    throw new Error('Error actualizando avatar: ' + error.message);
  }
}

export async function loadUser(userId, avatarImg) {
  try {
    console.log('Cargando datos del usuario desde Realtime Database:', userId);
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val();
      avatarImg.src = userData.avatar || '/assets/default-avatar.png';
    } else {
      console.warn('No se encontraron datos para el usuario:', userId);
    }
  } catch (error) {
    console.error('Error en loadUser:', error.message);
  }
}
