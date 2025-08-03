import { db } from "./db.js";

export const getFrauds = async () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM frauds", [], (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
};

export const getFraudByUserId = async (userId) => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM frauds WHERE userId = ?", [userId], (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });
};
export const addFraud = async (fraud) => {
    db.run("INSERT INTO frauds (transactionId, userId, timestamp, reason, flaggedAt) VALUES (?, ?, ?, ?, ?)", [
        fraud.transactionId,
        fraud.userId,
        fraud.timestamp,
        fraud.reason,
        fraud.flaggedAt
    ]);
};