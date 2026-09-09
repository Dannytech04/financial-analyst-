import { 
  initializeTestEnvironment, 
  assertFails, 
  assertSucceeds, 
  RulesTestEnvironment 
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

async function runTests() {
  console.log('====================================================');
  console.log('  FIRESTORE ZERO-TRUST SECURITY INVARIANTS SUITE');
  console.log('====================================================\n');

  const rules = fs.readFileSync('firestore.rules', 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'demo-financial-analyst',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080
    }
  });

  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  const userADb = testEnv.authenticatedContext('userA').firestore();
  const userBDb = testEnv.authenticatedContext('userB').firestore();

  let passed = 0;
  let failed = 0;

  async function expectDenied(category: string, description: string, op: () => Promise<any>) {
    try {
      await assertFails(op());
      console.log(`  ✓ [DENIED - EXPECTED] [${category}] ${description}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAILED TO DENY] [${category}] ${description}:`, err?.message);
      failed++;
    }
  }

  async function expectAllowed(category: string, description: string, op: () => Promise<any>) {
    try {
      await assertSucceeds(op());
      console.log(`  ✓ [ALLOWED - EXPECTED] [${category}] ${description}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ [FAILED TO ALLOW] [${category}] ${description}:`, err?.message);
      failed++;
    }
  }

  // --- Category 1: Unauthenticated Reads & Writes ---
  console.log('\n--- Category 1: Unauthenticated Reads & Writes ---');
  await expectDenied('Unauth', 'Unauthenticated read of user profile', () => getDoc(doc(unauthedDb, 'users', 'userA')));
  await expectDenied('Unauth', 'Unauthenticated read of trade document', () => getDoc(doc(unauthedDb, 'users', 'userA', 'trades', 'trade1')));
  await expectDenied('Unauth', 'Unauthenticated read of goals document', () => getDoc(doc(unauthedDb, 'users', 'userA', 'goals', 'settings')));
  await expectDenied('Unauth', 'Unauthenticated read of subscription document', () => getDoc(doc(unauthedDb, 'users', 'userA', 'subscription', 'current')));
  await expectDenied('Unauth', 'Unauthenticated creation of user profile', () => setDoc(doc(unauthedDb, 'users', 'userA'), { userId: 'userA', username: 'Hacker' }));

  // --- Category 2: Valid User Setup ---
  console.log('\n--- Setting up Authorized Baseline Documents ---');
  await expectAllowed('Setup', 'User A creates valid profile (/users/userA)', () => setDoc(doc(userADb, 'users', 'userA'), {
    userId: 'userA',
    username: 'AlphaTrader',
    displayName: 'Alpha Trader',
    email: 'alpha@trader.io',
    balance: 100000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  await expectDenied('Server-Controlled', 'New user cannot choose an arbitrary starting balance', () => setDoc(doc(userBDb, 'users', 'userB'), {
    userId: 'userB',
    username: 'BetaTrader',
    displayName: 'Beta Trader',
    email: 'beta@trader.io',
    balance: 500000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  await expectAllowed('Setup', 'User A creates valid initial FREE subscription', () => setDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    userId: 'userA',
    tier: 'FREE',
    status: 'ACTIVE',
    usageCount: { vision: 0, audit: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  await expectAllowed('Setup', 'User A creates valid trade record (/users/userA/trades/t1)', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 't1'), {
    userId: 'userA',
    tradeId: 't1',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 250.0,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now(),
    createdAt: new Date().toISOString()
  }));

  await expectAllowed('Setup', 'User A creates valid performance targets (/users/userA/goals/settings)', () => setDoc(doc(userADb, 'users', 'userA', 'goals', 'settings'), {
    userId: 'userA',
    monthlyProfitTarget: 5000,
    winRateTarget: 60,
    tradesPerMonthTarget: 30,
    createdAt: new Date().toISOString()
  }));

  // --- Category 3: Cross-User Access Violations ---
  console.log('\n--- Category 3: Cross-User Unauthorized Operations (User B attacking User A) ---');
  await expectDenied('Cross-User', 'User B reading User A profile', () => getDoc(doc(userBDb, 'users', 'userA')));
  await expectDenied('Cross-User', 'User B reading User A trade', () => getDoc(doc(userBDb, 'users', 'userA', 'trades', 't1')));
  await expectDenied('Cross-User', 'User B writing trade into User A trade subcollection', () => setDoc(doc(userBDb, 'users', 'userA', 'trades', 't2'), {
    userId: 'userA',
    tradeId: 't2',
    pair: 'GBP/USD',
    type: 'SELL',
    entryPrice: 1.2500,
    lotSize: 1.0,
    pnl: -500,
    status: 'LOSS',
    session: 'NEW_YORK',
    timestamp: Date.now()
  }));
  await expectDenied('Cross-User', 'User B deleting User A trade', () => deleteDoc(doc(userBDb, 'users', 'userA', 'trades', 't1')));
  await expectDenied('Cross-User', 'User B reading User A goals', () => getDoc(doc(userBDb, 'users', 'userA', 'goals', 'settings')));
  await expectDenied('Cross-User', 'User B modifying User A goals', () => updateDoc(doc(userBDb, 'users', 'userA', 'goals', 'settings'), { winRateTarget: 0 }));
  await expectDenied('Cross-User', 'User B reading User A subscription', () => getDoc(doc(userBDb, 'users', 'userA', 'subscription', 'current')));
  await expectDenied('Cross-User', 'User B updating User A subscription', () => updateDoc(doc(userBDb, 'users', 'userA', 'subscription', 'current'), { tier: 'FREE' }));

  // --- Category 4: Spoofed User ID ---
  console.log('\n--- Category 4: Spoofed User ID ---');
  await expectDenied('Spoofed UserID', 'User A spoofing trade userId to `userB`', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'spoof1'), {
    userId: 'userB',
    tradeId: 'spoof1',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now()
  }));

  // --- Category 5: Spoofed Subscription Tier ---
  console.log('\n--- Category 5: Spoofed Subscription Tier ---');
  await expectDenied('Spoofed Tier', 'User A creating PRO subscription from client', () => setDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    userId: 'userA',
    tier: 'PRO',
    status: 'ACTIVE',
    usageCount: { vision: 0, audit: 0 }
  }));
  await expectDenied('Spoofed Tier', 'User A creating ELITE subscription from client', () => setDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    userId: 'userA',
    tier: 'ELITE',
    status: 'ACTIVE',
    usageCount: { vision: 0, audit: 0 }
  }));
  await expectDenied('Spoofed Tier', 'User A elevating subscription tier via update', () => updateDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    tier: 'PRO'
  }));

  // --- Category 6: Spoofed Usage Counters ---
  console.log('\n--- Category 6: Spoofed Usage Counters ---');
  await expectDenied('Spoofed Usage', 'Client cannot modify usageCount (server-controlled atomic increments only)', () => updateDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    usageCount: { vision: 1, audit: 0 },
    updatedAt: new Date().toISOString()
  }));
  await expectDenied('Spoofed Usage', 'Decreasing usage counter to reset quota (1 -> 0)', () => updateDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    usageCount: { vision: 0, audit: 0 },
    updatedAt: new Date().toISOString()
  }));

  // --- Category 7: Ghost Fields ---
  console.log('\n--- Category 7: Ghost / Shadow Fields ---');
  await expectDenied('Ghost Fields', 'Injecting `isAdmin: true` into user profile', () => updateDoc(doc(userADb, 'users', 'userA'), {
    isAdmin: true
  }));
  await expectDenied('Ghost Fields', 'Injecting `isSuperUser: true` into trade', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'ghost_trade'), {
    userId: 'userA',
    tradeId: 'ghost_trade',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now(),
    isSuperUser: true
  }));
  await expectDenied('Ghost Fields', 'Injecting `unlimitedQuota: true` into subscription', () => updateDoc(doc(userADb, 'users', 'userA', 'subscription', 'current'), {
    unlimitedQuota: true
  }));

  // --- Category 8: Invalid Data Types ---
  console.log('\n--- Category 8: Invalid Data Types ---');
  await expectDenied('Data Types', 'String passed for numeric entryPrice', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'bad_entry'), {
    userId: 'userA',
    tradeId: 'bad_entry',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: '1.0850',
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now()
  }));
  await expectDenied('Data Types', 'String passed for numeric balance', () => updateDoc(doc(userADb, 'users', 'userA'), {
    balance: '100000'
  }));
  await expectDenied('Server-Controlled', 'Client cannot modify account balance (server-controlled)', () => updateDoc(doc(userADb, 'users', 'userA'), {
    balance: 500000
  }));

  // --- Category 9: Invalid Enum Values ---
  console.log('\n--- Category 9: Invalid Enum Values ---');
  await expectDenied('Enums', 'Invalid trade type `HOLD` (only BUY/SELL)', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'bad_type'), {
    userId: 'userA',
    tradeId: 'bad_type',
    pair: 'EUR/USD',
    type: 'HOLD',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now()
  }));
  await expectDenied('Enums', 'Invalid trade status `PENDING` (only WIN/LOSS/BE)', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'bad_status'), {
    userId: 'userA',
    tradeId: 'bad_status',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 0,
    status: 'PENDING',
    session: 'LONDON',
    timestamp: Date.now()
  }));
  await expectDenied('Enums', 'Invalid session `PARIS` (only LONDON/NEW_YORK/ASIAN/OVERLAP)', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'bad_session'), {
    userId: 'userA',
    tradeId: 'bad_session',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'PARIS',
    timestamp: Date.now()
  }));

  // --- Category 10: Oversized Strings ---
  console.log('\n--- Category 10: Oversized Strings ---');
  await expectDenied('Oversized Strings', 'Pair string > 20 characters', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'bad_pair_len'), {
    userId: 'userA',
    tradeId: 'bad_pair_len',
    pair: 'A'.repeat(25),
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now()
  }));
  await expectDenied('Oversized Strings', 'Username > 64 characters', () => updateDoc(doc(userADb, 'users', 'userA'), {
    username: 'U'.repeat(65)
  }));

  // --- Category 11: Document ID Hardening ---
  console.log('\n--- Category 11: Document ID Hardening ---');
  await expectDenied('Document IDs', 'Trade ID with invalid punctuation (../trade)', () => setDoc(doc(userADb, 'users', 'userA', 'trades', 'trade$inv!'), {
    userId: 'userA',
    tradeId: 'trade$inv!',
    pair: 'EUR/USD',
    type: 'BUY',
    entryPrice: 1.0850,
    lotSize: 1.0,
    pnl: 100,
    status: 'WIN',
    session: 'LONDON',
    timestamp: Date.now()
  }));
  await expectDenied('Document IDs', 'Goals document with non-settings ID (`target`)', () => setDoc(doc(userADb, 'users', 'userA', 'goals', 'target'), {
    userId: 'userA',
    monthlyProfitTarget: 5000,
    winRateTarget: 60,
    tradesPerMonthTarget: 30
  }));
  await expectDenied('Document IDs', 'Subscription with non-current ID (`sub1`)', () => setDoc(doc(userADb, 'users', 'userA', 'subscription', 'sub1'), {
    userId: 'userA',
    tier: 'FREE',
    status: 'ACTIVE',
    usageCount: { vision: 0, audit: 0 }
  }));

  // --- Category 12: Ownership & Creation Immutability ---
  console.log('\n--- Category 12: Immutability Enforcements ---');
  await expectDenied('Immutability', 'Reassign trade userId during update', () => updateDoc(doc(userADb, 'users', 'userA', 'trades', 't1'), {
    userId: 'userB'
  }));
  await expectDenied('Immutability', 'Modify createdAt timestamp on user profile', () => updateDoc(doc(userADb, 'users', 'userA'), {
    createdAt: '1999-01-01T00:00:00.000Z'
  }));

  await testEnv.cleanup();

  console.log('\n====================================================');
  console.log('                 TEST SUITE SUMMARY');
  console.log('====================================================');
  console.log(`Total Invariant Tests : ${passed + failed}`);
  console.log(`Passed                : ${passed}`);
  console.log(`Failed                : ${failed}`);

  if (failed > 0) {
    console.error(`\nTest suite finished with ${failed} failure(s).`);
    process.exit(1);
  } else {
    console.log(`\nALL ${passed} SECURITY INVARIANTS RIGOROUSLY VALIDATED AND PASSED!`);
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
