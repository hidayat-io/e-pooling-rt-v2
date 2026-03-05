const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';

/**
 * Generate JWT token untuk voter
 */
function signVoterToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY_VOTER || '2h',
    });
}

/**
 * Generate JWT token untuk admin
 */
function signAdminToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY_ADMIN || '24h',
    });
}

/**
 * Verifikasi JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = { signVoterToken, signAdminToken, verifyToken };
