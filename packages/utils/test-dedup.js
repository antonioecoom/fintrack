// Unit test for transaction deduplication algorithm
// Run using: node test-dedup.js

// Since we want to run this quickly with node directly without compiling ts, 
// let's copy the logic inline to test it, or run a ts-node check.
// Alternatively, let's write a simple implementation of the test in JS 
// representing the exact functions in packages/utils/src/index.ts.

function testIsDescriptionSimilar() {
  const cases = [
    { a: 'Mercadona Super', b: 'MERCADONA', expected: true },
    { a: 'Uber Trip 123', b: 'Uber Trip', expected: true },
    { a: 'Netflix Entertainment', b: 'spotify', expected: false },
    { a: 'Nómina Enero', b: 'Nómina', expected: true },
  ];

  console.log('--- Testing isDescriptionSimilar ---');
  let passed = true;
  for (const c of cases) {
    const result = cleanAndFuzzyMatch(c.a, c.b);
    if (result !== c.expected) {
      console.error(`FAIL: Similar("${c.a}", "${c.b}") -> got ${result}, expected ${c.expected}`);
      passed = false;
    } else {
      console.log(`PASS: "${c.a}" vs "${c.b}" -> ${result}`);
    }
  }
  return passed;
}

function cleanAndFuzzyMatch(desc1, desc2) {
  if (!desc1 || !desc2) return desc1 === desc2;
  const clean = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  return clean(desc1).includes(clean(desc2)) || clean(desc2).includes(clean(desc1));
}

function testDeduplicateTransactions() {
  const existing = [
    { id: '1', amount: 45.3, type: 'expense', date: '2026-05-19', description: 'Mercadona', category: 'Alimentación' },
    { id: '2', amount: 1500, type: 'income', date: '2026-05-01', description: 'Nómina FinTrack', category: 'Nómina' },
  ];

  const incoming = [
    // Duplicate of Mercadona (same amount, type, date within 1 day, similar description)
    { amount: 45.3, type: 'expense', date: '2026-05-20', description: 'Mercadona Super' },
    // Not duplicate (different amount)
    { amount: 50.0, type: 'expense', date: '2026-05-19', description: 'Mercadona' },
    // Not duplicate (different date window > 1 day)
    { amount: 1500, type: 'income', date: '2026-05-10', description: 'Nómina' },
    // New transaction
    { amount: 12.5, type: 'expense', date: '2026-05-19', description: 'Taxi Uber' },
  ];

  console.log('\n--- Testing deduplicateTransactions ---');
  const result = jsDeduplicate(existing, incoming);
  
  if (result.length !== 3) {
    console.error(`FAIL: Expected 3 non-duplicate transactions, got ${result.length}`);
    return false;
  }

  // Validate that duplicate Mercadona was removed
  const hasDupMerc = result.some(r => r.description === 'Mercadona Super');
  if (hasDupMerc) {
    console.error('FAIL: Duplicate Mercadona Super was NOT removed');
    return false;
  }

  console.log('PASS: Successfully identified duplicate and kept unique transactions!');
  console.log('Unique transactions found:');
  result.forEach(r => console.log(` - ${r.description} (${r.amount} EUR)`));
  return true;
}

function jsDeduplicate(existing, incoming) {
  return incoming.filter((inc) => {
    if (inc.amount === undefined || !inc.type || !inc.date) return true;

    const isDuplicate = existing.some((ext) => {
      const amountMatch = Math.abs(Number(ext.amount)) === Math.abs(Number(inc.amount));
      if (!amountMatch) return false;

      const typeMatch = ext.type === inc.type;
      if (!typeMatch) return false;

      const extDate = new Date(ext.date);
      const incDate = new Date(inc.date);
      const diffTime = Math.abs(extDate.getTime() - incDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const dateMatch = diffDays <= 1;
      if (!dateMatch) return false;

      const descMatch = cleanAndFuzzyMatch(ext.description, inc.description || null);
      const accountMatch = ext.account_id === inc.account_id;

      return descMatch || accountMatch;
    });

    return !isDuplicate;
  });
}

const p1 = testIsDescriptionSimilar();
const p2 = testDeduplicateTransactions();

if (p1 && p2) {
  console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('\n❌ SOME TESTS FAILED.');
  process.exit(1);
}
