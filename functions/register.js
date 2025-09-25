const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db('discordclone');
        const users = db.collection('users');

        const data = JSON.parse(event.body);
        const user = await users.findOne({ username: data.username });
        if (user) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Usuario existe' }) };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);
        const result = await users.insertOne({
            username: data.username,
            password: hashedPassword,
            avatar: '/assets/default-avatar.png',
            created_at: new Date()
        });

        const token = jwt.sign({ user_id: result.insertedId }, process.env.SECRET_KEY, { expiresIn: '24h' });
        return {
            statusCode: 200,
            body: JSON.stringify({ token, user: data.username })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    } finally {
        await client.close();
    }
};