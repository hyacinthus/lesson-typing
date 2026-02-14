import { getGrade } from './statsCalculator.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error('❌ ' + message);
    process.exit(1);
  }
}

console.log('Running tests for getGrade...');

const testCases = [
  // Grade S: accuracy >= 95 and speed >= 200
  { accuracy: 95, speed: 200, expected: 'S' },
  { accuracy: 96, speed: 210, expected: 'S' },
  { accuracy: 100, speed: 300, expected: 'S' },

  // Grade A: accuracy >= 90 and speed >= 150
  { accuracy: 94, speed: 200, expected: 'A' },
  { accuracy: 95, speed: 199, expected: 'A' },
  { accuracy: 90, speed: 150, expected: 'A' },
  { accuracy: 91, speed: 160, expected: 'A' },

  // Grade B: accuracy >= 80 and speed >= 100
  { accuracy: 89, speed: 150, expected: 'B' },
  { accuracy: 90, speed: 149, expected: 'B' },
  { accuracy: 80, speed: 100, expected: 'B' },
  { accuracy: 81, speed: 110, expected: 'B' },

  // Grade C: accuracy >= 70
  { accuracy: 79, speed: 100, expected: 'C' },
  { accuracy: 80, speed: 99, expected: 'C' },
  { accuracy: 70, speed: 0, expected: 'C' },
  { accuracy: 75, speed: 50, expected: 'C' },

  // Grade D: accuracy < 70
  { accuracy: 69, speed: 300, expected: 'D' },
  { accuracy: 0, speed: 0, expected: 'D' },
];

testCases.forEach(({ accuracy, speed, expected }) => {
  const result = getGrade(accuracy, speed);
  assert(result.grade === expected, `getGrade(${accuracy}, ${speed}) should be ${expected}, but got ${result.grade}`);
  console.log(`✓ getGrade(${accuracy}, ${speed}) === ${expected}`);
});

console.log('\n✅ All getGrade tests passed!');
