import { ref, push, set, onValue, query, orderByChild } from 'firebase/database';
import { db } from './firebase';

export async function createChat(participants, chatName) {
  try {
    const chatRef = push(ref(db, 'chats'));
    await set(chatRef, {
      name: chatName,
      participants,
      createdAt: Date.now()
    });
    return chatRef.key;
  } catch (error) {
    throw new Error('Error creando chat: ' + error.message);
  }
}

export async function sendMessage(chatId, senderId, text, username) {
  try {
    const messagesRef = ref(db, `chats/${chatId}/messages`);
    await push(messagesRef, {
      sender: senderId,
      username,
      text,
      timestamp: Date.now()
    });
  } catch (error) {
    throw new Error('Error enviando mensaje: ' + error.message);
  }
}

export function listenToMessages(chatId, callback) {
  const messagesRef = ref(db, `chats/${chatId}/messages`);
  const q = query(messagesRef, orderByChild('timestamp'));
  return onValue(q, (snapshot) => {
    const messages = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });
    callback(messages);
  });
}

export async function loadChats(userId, chatList, switchChat) {
  try {
    const chatsRef = ref(db, 'chats');
    onValue(chatsRef, (snapshot) => {
      chatList.innerHTML = '';
      snapshot.forEach((childSnapshot) => {
        const chat = childSnapshot.val();
        if (chat.participants.includes(userId)) {
          const li = document.createElement('li');
          li.className = 'list-group-item list-group-item-action cursor-pointer p-2 bg-gray-700 rounded hover:bg-gray-600';
          li.textContent = chat.name;
          li.onclick = () => switchChat(childSnapshot.key, chat.name);
          chatList.appendChild(li);
        }
      });
    });
  } catch (error) {
    console.error('Error cargando chats:', error);
  }
}