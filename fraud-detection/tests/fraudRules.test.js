// fraudRules.test.js
import { evaluateFraud } from './fraudRules.js';

describe('Fraud Detection Logic', () => {

    it('flags amount > $5000 and not in USA', () => {
        const tx = { userId: '1', amount: 7000, location: 'UK' };
        const result = evaluateFraud(tx, []);
        expect(result.flagged).toBe(true);
        expect(result.reason).toBe('Amount > $5000 and not in USA');
    });

    it('does not flag amount > $5000 in USA', () => {
        const tx = { userId: '1', amount: 6999, location: 'USA' };
        const result = evaluateFraud(tx, []);
        expect(result.flagged).toBe(false);
    });

    it('flags multiple transactions for the same user in 10 seconds', () => {
        const tx = { userId: '1', amount: 200, location: 'USA' };
        const recentTxns = [{ userId: '1', amount: 100, location: 'USA' }];
        const result = evaluateFraud(tx, recentTxns);
        expect(result.flagged).toBe(true);
        expect(result.reason).toBe('Multiple transactions in 10 seconds');
    });

    it('flags amount as a multiple of 1000', () => {
        const tx = { userId: '2', amount: 3000, location: 'USA' };
        const result = evaluateFraud(tx, []);
        expect(result.flagged).toBe(true);
        expect(result.reason).toBe('Amount is a multiple of 1000');
    });

    it('does not flag safe transactions', () => {
        const tx = { userId: '3', amount: 200, location: 'USA' };
        const result = evaluateFraud(tx, []);
        expect(result.flagged).toBe(false);
    });
});
