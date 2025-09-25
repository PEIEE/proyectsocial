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
        const query = 'SELECT * FROM users WHERE username = $1';
        const result = await client.query(query, [data.username]);
        if (result.rows.length === 0) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Usuario no encontrado' })
            };
        }

        // Verificar contraseña
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(data.password, user.password);
        if (!isMatch) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Contraseña incorrecta' })
            };
        }

        // Generar token
        const token = jwt.sign({ user_id: user.id }, process.env.SECRET_KEY, { expiresIn: '24h' });
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ token, user: data.username })
        };
    } catch (err) {
        console.error('Error en login:', err);
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: `Error del servidor: ${err.message}` })
        };
    } finally {
        await client.end();
    }
};
