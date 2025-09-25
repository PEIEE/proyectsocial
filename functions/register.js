const { Client } = require('pg');
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

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const data = JSON.parse(event.body);
        if (!data.username || !data.password) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Faltan username o password' })
            };
        }

        // Verificar si el usuario existe
        const checkQuery = 'SELECT * FROM users WHERE username = $1';
        const checkResult = await client.query(checkQuery, [data.username]);
        if (checkResult.rows.length > 0) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Usuario existe' })
            };
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(data.password, 8);

        // Insertar usuario
        const insertQuery = 'INSERT INTO users (username, password, avatar, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id';
        const insertResult = await client.query(insertQuery, [data.username, hashedPassword, '/assets/default-avatar.png']);

        // Generar token
        const token = jwt.sign({ user_id: insertResult.rows[0].id }, process.env.SECRET_KEY, { expiresIn: '24h' });
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
        await client.end();
    }
};
