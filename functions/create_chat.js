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

        const data = JSON.parse(event.body);
        const result = await chats.insertOne({
            name: data.name,
            members: [decoded.user_id],
            created_at: new Date()
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ chat_id: result.insertedId })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.close();
    }
};