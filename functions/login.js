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
        if (!user) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
        }

        const isPasswordValid = await bcrypt.compare(data.password, user.password);
        if (!isPasswordValid) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Contraseña incorrecta' }) };
        }

        const token = jwt.sign({ user_id: user._id }, process.env.SECRET_KEY, { expiresIn: '24h' });
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