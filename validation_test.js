// Simple validation test file for Christ-centric content moderation
// Run with: node validation_test.js

import { validateFaithContent, moderateContent } from './shared/moderation.js';

console.log('🔍 Testing Enhanced Faith Content Validation\n');

// Test cases
const testCases = [
  // Positive cases (should pass)
  {
    text: "Jesus loves you",
    expected: true,
    description: "Christian term: Jesus"
  },
  {
    text: "John 3:16 says...",
    expected: true,
    description: "Bible reference: John 3:16"
  },
  {
    text: "Psalm 23 is comforting",
    expected: true,
    description: "Bible reference: Psalm 23"
  },
  {
    text: "Christ died for our sins",
    expected: true,
    description: "Christian term: Christ"
  },
  {
    text: "Romans 8:28 - all things work together for good",
    expected: true,
    description: "Bible reference: Romans 8:28"
  },
  
  // Negative cases (should fail)
  {
    text: "Hi",
    expected: false,
    description: "Too short (< 6 characters)"
  },
  {
    text: "Generic message with no faith content",
    expected: false,
    description: "No Christian terms or Bible references"
  },
  {
    text: "I pray to allah for help",
    expected: false,
    description: "Blocked term: allah"
  },
  {
    text: "Buddha shows the way",
    expected: false,
    description: "No explicit Christian content"
  },
  {
    text: "Let us meditate on the universe",
    expected: false,
    description: "New age spirituality"
  },
  
  // Edge cases
  {
    text: "I came from islam to christ",
    expected: true,
    description: "Contextual allowance: testimony phrase"
  },
  {
    text: "Sharing the gospel with muslims",
    expected: true,
    description: "Contextual allowance: missionary phrase"
  }
];

let passed = 0;
let failed = 0;

console.log('Test Results:');
console.log('='.repeat(50));

testCases.forEach((testCase, index) => {
  try {
    const result = validateFaithContent(testCase.text);
    const success = result.isValid === testCase.expected;
    
    if (success) {
      console.log(`✅ Test ${index + 1}: ${testCase.description}`);
      passed++;
    } else {
      console.log(`❌ Test ${index + 1}: ${testCase.description}`);
      console.log(`   Text: "${testCase.text}"`);
      console.log(`   Expected: ${testCase.expected}, Got: ${result.isValid}`);
      console.log(`   Reason: ${result.reason || 'No reason'}`);
      failed++;
    }
  } catch (error) {
    console.log(`💥 Test ${index + 1}: ERROR - ${error.message}`);
    failed++;
  }
});

console.log('='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! Faith validation is working correctly.');
} else {
  console.log('🚨 Some tests failed. Please review the validation logic.');
}