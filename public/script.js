// Configuración de Pusher - Reemplaza con tus valores reales de las env vars de Netlify
const PUSHER_APP_KEY = 'TU_PUSHER_KEY_AQUI'; // Obtén de Netlify Environment Variables
const PUSHER_CLUSTER = 'us2'; // Tu cluster de Pusher

const pusher = new Pusher(PUSHER_APP_KEY, {
    cluster: PUSHER_CLUSTER,
    encrypted: true
});

let currentChatId = 'general';
let token = localStorage.getItem('token');
let username = localStorage.getItem('username');
let peer = new Peer();
let channel;

// Redirigir si no hay token
if (!token) {
    window.location.href = '/login.html';
    return;
}

// Cargar usuario
function loadUser() {
    document.getElementById('username').textContent = username;
    fetch('/.netlify/functions/get_avatar', {  // Ajustado para Netlify Functions
        headers: {Authorization: `Bearer ${token}`}
    }).then(res => res.json()).then(data => {
        const avatarImg = document.getElementById('avatar');
        if (avatarImg) {
            avatarImg.src = data.avatar || '/assets/default-avatar.png';
        }
    }).catch(err => console.error('Error cargando avatar:', err));
}

// Event listener para subir avatar
const avatarImg = document.getElementById('avatar');
const avatarUpload = document.getElementById('avatar-upload');
if (avatarImg && avatarUpload) {
    avatarImg.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            fetch('/.netlify/functions/upload_avatar', {
                method: 'POST',
                headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
                body: JSON.stringify({avatar: ev.target.result})
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    avatarImg.src = ev.target.result;
                }
            }).catch(err => console.error('Error subiendo avatar:', err));
        };
        if (e.target.files[0]) {
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// Crear nuevo chat
const newChatBtn = document.getElementById('new-chat');
if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
        const chatName = prompt('Nombre del nuevo chat:');
        if (chatName) {
            fetch('/.netlify/functions/create_chat', {
                method: 'POST',
                headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
                body: JSON.stringify({name: chatName})
            }).then(res => res.json()).then(data => {
                if (data.chat_id) {
                    const list = document.getElementById('chat-list');
                    const li = document.createElement('li');
                    li.className = 'list-group-item list-group-item-action cursor-pointer p-2 bg-gray-700 rounded hover:bg-gray-600';
                    li.textContent = chatName;
                    li.onclick = () => switchChat(data.chat_id, chatName);
                    list.appendChild(li);
                }
            }).catch(err => console.error('Error creando chat:', err));
        }
    });
}

// Cambiar de chat
function switchChat(chatId, chatName) {
    currentChatId = chatId;
    if (channel) {
        pusher.unsubscribe(`chat-${channel.name.replace('chat-', '')}`);
    }
    channel = pusher.subscribe(`chat-${chatId}`);
    channel.bind('new_message', handleNewMessage);
    loadMessages();
    // Actualizar UI si es necesario (ej. header con nombre del chat)
}

// Cargar mensajes
function loadMessages() {
    fetch(`/.netlify/functions/get_messages?chat_id=${currentChatId}`, {
        headers: {Authorization: `Bearer ${token}`}
    }).then(res => res.json()).then(msgs => {
        const container = document.getElementById('messages');
        if (container) {
            container.innerHTML = '';
            msgs.forEach(msg => {
                const div = document.createElement('div');
                div.className = 'message flex mb-2';
                div.innerHTML = `
                    <div class="w-8 h-8 bg-gray-500 rounded-full mr-2 flex-shrink-0"></div>
                    <div>
                        <strong class="text-blue-400">${msg.username}:</strong> ${msg.message}
                        <small class="text-gray-400 ml-2">${new Date(msg.timestamp).toLocaleTimeString()}</small>
                    </div>
                `;
                container.appendChild(div);
            });
            container.scrollTop = container.scrollHeight;
        }
    }).catch(err => console.error('Error cargando mensajes:', err));
}

// Manejar nuevo mensaje
function handleNewMessage(msg) {
    if (msg.chat_id === currentChatId) {
        const container = document.getElementById('messages');
        if (container) {
            const div = document.createElement('div');
            div.className = 'message flex mb-2';
            div.innerHTML = `
                <div class="w-8 h-8 bg-gray-500 rounded-full mr-2 flex-shrink-0"></div>
                <div>
                    <strong class="text-blue-400">${msg.username}:</strong> ${msg.message}
                    <small class="text-gray-400 ml-2">${new Date(msg.timestamp).toLocaleTimeString()}</small>
                </div>
            `;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    }
}

// Enviar mensaje
const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');
if (sendBtn && messageInput) {
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function sendMessage() {
    if (messageInput.value.trim()) {
        fetch(`/.netlify/functions/send_message`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({
                chat_id: currentChatId,
                message: messageInput.value,
                username: username
            })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                messageInput.value = '';
            }
        }).catch(err => console.error('Error enviando mensaje:', err));
    }
}

// Suscribir al canal inicial
channel = pusher.subscribe(`chat-${currentChatId}`);
channel.bind('new_message', handleNewMessage);

// Cargar chats iniciales
fetch('/.netlify/functions/get_chats', {
    headers: {Authorization: `Bearer ${token}`}
}).then(res => res.json()).then(chats => {
    const list = document.getElementById('chat-list');
    if (list) {
        chats.forEach(chat => {
            const li = document.createElement('li');
            li.className = 'list-group-item list-group-item-action cursor-pointer p-2 bg-gray-700 rounded hover:bg-gray-600';
            li.textContent = chat.name;
            li.onclick = () => switchChat(chat._id, chat.name);
            list.appendChild(li);
        });
    }
}).catch(err => console.error('Error cargando chats:', err));

// Sistema de llamadas WebRTC
const callBtn = document.getElementById('call-btn');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
let localStream, call;

if (callBtn) {
    callBtn.addEventListener('click', async () => {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({video: true, audio: true});
            if (localVideo) {
                localVideo.srcObject = localStream;
                localVideo.classList.remove('hidden');
            }

            const otherPeerId = prompt('ID del otro usuario (pide su Peer ID):');
            if (otherPeerId) {
                call = peer.call(otherPeerId, localStream);
                call.on('stream', (remoteStream) => {
                    if (remoteVideo) {
                        remoteVideo.srcObject = remoteStream;
                        remoteVideo.classList.remove('hidden');
                    }
                });
            }
        } catch (err) {
            console.error('Error iniciando llamada:', err);
            alert('No se pudo iniciar la llamada. Asegúrate de permitir cámara y micrófono.');
        }
    });
}

if (peer) {
    peer.on('call', (incomingCall) => {
        navigator.mediaDevices.getUserMedia({video: true, audio: true}).then((stream) => {
            incomingCall.answer(stream);
            incomingCall.on('stream', (remoteStream) => {
                if (remoteVideo) {
                    remoteVideo.srcObject = remoteStream;
                    remoteVideo.classList.remove('hidden');
                }
            });
        }).catch(err => console.error('Error recibiendo llamada:', err));
    });

    peer.on('open', (id) => {
        console.log('Tu Peer ID:', id);
        alert('Tu Peer ID es: ' + id + '. Compártelo para recibir llamadas.');
    });
}

// Inicializar
loadUser();
loadMessages();