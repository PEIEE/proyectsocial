import { ref, set, update, onValue } from 'firebase/database';
import { db } from './firebase';
import Peer from 'peerjs';

let localStream;
let peer;

export async function getLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    return localStream;
  } catch (error) {
    throw new Error('Error obteniendo stream: ' + error.message);
  }
}

export async function startCall(callerId, calleeId, localVideoElement, remoteVideoElement) {
  try {
    const callId = Date.now().toString();

    peer = new Peer(callerId, {
      config: {
        iceServers: [
          { urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302' }
        ]
      }
    });

    localVideoElement.srcObject = localStream;
    localVideoElement.classList.remove('hidden');

    const call = peer.call(calleeId, localStream);
    call.on('stream', (remoteStream) => {
      remoteVideoElement.srcObject = remoteStream;
      remoteVideoElement.classList.remove('hidden');
    });

    await set(ref(db, `calls/${callId}`), {
      participants: [callerId, calleeId],
      status: 'ringing',
      createdAt: Date.now()
    });

    return callId;
  } catch (error) {
    throw new Error('Error iniciando llamada: ' + error.message);
  }
}

export async function answerCall(callId, localVideoElement, remoteVideoElement, userId) {
  try {
    peer = new Peer(userId, {
      config: {
        iceServers: [
          { urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302' }
        ]
      }
    });

    localVideoElement.srcObject = localStream;
    localVideoElement.classList.remove('hidden');

    peer.on('call', (call) => {
      call.answer(localStream);
      call.on('stream', (remoteStream) => {
        remoteVideoElement.srcObject = remoteStream;
        remoteVideoElement.classList.remove('hidden');
      });
      update(ref(db, `calls/${callId}`), { status: 'active' });
    });

    peer.on('open', (id) => {
      console.log('Tu Peer ID:', id);
    });
  } catch (error) {
    throw new Error('Error respondiendo llamada: ' + error.message);
  }
}