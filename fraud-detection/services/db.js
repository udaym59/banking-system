import sqlite3 from 'sqlite3'

export const db = new sqlite3.Database(process.env.DB, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});
db.configure('busyTimeout', 15000);
db.run('PRAGMA journal_mode=WAL;', (err) => {
  if (err) {
    console.log('Error enabling WAL mode:', err);
  } else {
    console.log('WAL mode enabled');
  }
});
db.run("CREATE TABLE IF NOT EXISTS frauds (id INTEGER PRIMARY KEY, transactionId TEXT, userId TEXT, timestamp TEXT, reason TEXT, flaggedAt TEXT)");

