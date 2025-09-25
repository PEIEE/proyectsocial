const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
    const token = event.headers.authorization ? event.headers.authorization.replace('Bearer ', '') : '';
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
        return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
    }

    const chatId = event.queryStringParameters ? event.queryStringParameters.chat_id : '';
    if (!chatId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'chat_id requerido' }) };
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('discordclone');
        const messages = db.collection('messages');

        const msgs = await messages.find({ chat_id: chatId }).sort({ timestamp: 1 }).limit(50).toArray();
        const formattedMsgs = msgs.map(msg => ({
            ...msg,
            _id: msg._id.toString(),
            timestamp: msg.timestamp.toISOString()
        }));
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify(formattedMsgs)
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.close();
    }
};