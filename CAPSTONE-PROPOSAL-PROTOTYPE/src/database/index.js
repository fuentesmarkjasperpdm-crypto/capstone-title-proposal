/**
 * Database Module - Connection and Query Helper
 * OBJECTIVE MAPPING:
 * - Provides centralized database access for all POS operations
 * - Enables transaction consistency for order processing
 * - Supports both online and offline queue operations
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/kohisync.db');
const DATA_DIR = path.join(__dirname, '../../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database connection
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database at', DB_PATH);
});

/**
 * Initialize database schema
 * SCOPE: Single-branch, local deployment
 * Reads schema from schema.sql and creates all required tables
 */
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        // Enable foreign keys first
        db.run('PRAGMA foreign_keys = ON', (err) => {
            if (err) {
                console.error('Error enabling foreign keys:', err);
                reject(err);
                return;
            }

            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf-8');

            // Split SQL statements and execute them sequentially
            const statements = schema.split(';').filter(stmt => stmt.trim());

            if (statements.length === 0) {
                console.log('Database schema initialized successfully');
                resolve();
                return;
            }

            let index = 0;

            const executeNext = () => {
                if (index >= statements.length) {
                    console.log('Database schema initialized successfully');
                    resolve();
                    return;
                }

                const statement = statements[index].trim();
                if (statement) {
                    db.run(statement, (err) => {
                        if (err) {
                            console.error(`Error executing statement ${index + 1}:`, err);
                            reject(err);
                            return;
                        }
                        index++;
                        executeNext();
                    });
                } else {
                    index++;
                    executeNext();
                }
            };

            executeNext();
        });
    });
}

/**
 * Helper function to run queries
 * Wraps callback-based sqlite3 in Promise for async/await usage
 */
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

/**
 * Helper function to get a single row
 */
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * Helper function to get all rows
 */
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows || []);
            }
        });
    });
}

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

module.exports = {
    db,
    initializeDatabase,
    dbRun,
    dbGet,
    dbAll
};
