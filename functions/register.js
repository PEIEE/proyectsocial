const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.handler = async (event, context) => {
    if (!event.body) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Cuerpo de la solicitud vacío' })
        };
    }

    const client = new MongoClient(process.env.MONGODB_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000
    });

    try {
        await client.connect();
        const db = client.db('discordclone');
        const users = db.collection('users');

        const data = JSON.parse(event.body);
        if (!data.username || !data.password) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Faltan username o password' })
            };
        }

        const user = await users.findOne({ username: data.username });
        if (user) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Usuario existe' })
            };
        }

        const hashedPassword = await bcrypt.hash(data.password, 8);
        const result = await users.insertOne({
            username: data.username,
            password: hashedPassword,
            avatar: '/assets/default-avatar.png',
            created_at: new Date()
        });

        const token = jwt.sign({ user_id: result.insertedId }, process.env.SECRET_KEY, { expiresIn: '24h' });
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ token, user: data.username })
        };
    } catch (err) {
        console.error('Error en register:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: `Error del servidor: ${err.message}` })
        };
    } finally {
        await client.close();
    }
};
