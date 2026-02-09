/**
 * Authentication Controller
 * OBJECTIVE: Secure login for Staff/Admin with role-based access
 * SCOPE: Session-based authentication for local Wi-Fi network
 */

const { dbGet, dbRun } = require('../database');

/**
 * Login endpoint
 * Validates credentials and creates session
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Simple authentication (in production: use bcrypt for password hashing)
        const user = await dbGet(
            'SELECT id, username, full_name, role FROM users WHERE username = ? AND password = ?',
            [username, password]
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create session
        req.session.user_id = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.full_name = user.full_name;

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Logout endpoint
 * Destroys session
 */
function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
}

/**
 * Get current user info
 */
async function getCurrentUser(req, res) {
    if (!req.session || !req.session.user_id) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const user = await dbGet(
            'SELECT id, username, full_name, role FROM users WHERE id = ?',
            [req.session.user_id]
        );

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (err) {
        console.error('Error getting current user:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Create new user (Admin only)
 * SCOPE: Only admins can create staff accounts
 */
async function createUser(req, res) {
    try {
        const { username, password, full_name, role } = req.body;

        if (!username || !password || !full_name || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }

        if (!['admin', 'staff'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        // Check if username already exists
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        // Insert new user
        const result = await dbRun(
            'INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)',
            [username, password, full_name, role]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user_id: result.lastID
        });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * List all users (Admin only)
 */
async function listUsers(req, res) {
    try {
        const users = await dbAll(
            'SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ users });
    } catch (err) {
        console.error('Error listing users:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    login,
    logout,
    getCurrentUser,
    createUser,
    listUsers
};
