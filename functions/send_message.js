const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const Pusher = require('pusher');

const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
});

exports.handler = async (event, context) => {
    const token = event.headers.authorization ? event.headers.authorization.replace('Bearer ', '') : '';
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
        return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('discordclone');
        const messages = db.collection('messages');

        const data = JSON.parse(event.body);
        const { chat_id, message, username } = data;
        
        const result = await messages.insertOne({
            chat_id: chat_id,
            user_id: decoded.user_id,
            username: username,
            message: message,
            timestamp: new Date()
        });

        const newMessage = {
            id: result.insertedId.toString(),
            chat_id: chat_id,
            username: username,
            message: message,
            timestamp: new Date().toISOString()
        };

        await pusher.trigger(`chat-${chat_id}`, 'new_message', newMessage);

        return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.close();
    }
};