import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from './firebase';

export async function registerUser(email, password, username) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: username });

    await set(ref(db, 'users/' + user.uid), {
      username,
      email,
      avatar: '/assets/default-avatar.png',
      status: 'offline'
    });

    return user;
  } catch (error) {
    throw error; // Propagar el error para que login.html lo maneje
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error; // Propagar el error para que login.html lo maneje
  }
}

export async function updateAvatar(userId, avatarUrl) {
  try {
    if (!avatarUrl.startsWith('http')) {
      throw new Error('La URL del avatar debe comenzar con http o https');
    }
    await set(ref(db, `users/${userId}/avatar`), avatarUrl);
    return avatarUrl;
  } catch (error) {
    throw new Error('Error actualizando avatar: ' + error.message);
  }
}

export async function loadUser(userId, avatarImg) {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const userData = snapshot.val();
      avatarImg.src = userData.avatar || '/assets/default-avatar.png';
    }
  } catch (error) {
    console.error('Error cargando usuario:', error);
  }
}
