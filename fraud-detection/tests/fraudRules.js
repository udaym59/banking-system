export function evaluateFraud(tx, recentTxns) {
    if (tx.amount > 5000 && tx.location !== 'USA') {
        return { flagged: true, reason: 'Amount > $5000 and not in USA' };
    }
    if (recentTxns.filter(t => t.userId === tx.userId).length > 0) {
        return { flagged: true, reason: 'Multiple transactions in 10 seconds' };
    }
    if (tx.amount % 1000 === 0) {
        return { flagged: true, reason: 'Amount is a multiple of 1000' };
    }
    return { flagged: false };
}