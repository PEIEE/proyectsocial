const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
    const token = event.headers.authorization.replace('Bearer ', '');
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
        const chats = db.collection('chats');

        const userChats = await chats.find({ members: decoded.user_id }).toArray();
        userChats.forEach(chat => chat._id = chat._id.toString());
        return {
            statusCode: 200,
            body: JSON.stringify(userChats)
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.close();
    }
};