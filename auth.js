import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';

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
    throw new Error(error.message);
  }
}

export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function uploadAvatar(file, userId) {
  try {
    const avatarRef = storageRef(storage, `avatars/${userId}`);
    await uploadBytes(avatarRef, file);
    const url = await getDownloadURL(avatarRef);
    await set(ref(db, `users/${userId}/avatar`), url);
    return url;
  } catch (error) {
    throw new Error('Error subiendo avatar: ' + error.message);
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