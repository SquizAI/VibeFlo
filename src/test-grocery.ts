import { cleanGroceryItemText, testGroceryItemCleaning } from './lib/ai';

// Run the test function
testGroceryItemCleaning();

// Test with some additional examples
const additionalTests = [
  "buy 2 pounds of ground beef",
  "get a dozen eggs",
  "purchase some bread",
  "pick up 1 gallon of milk",
  "grab 3 apples",
  "need to buy bananas",
  "we should get cheese",
  "don't forget to buy coffee"
];

console.log("\nAdditional tests:");
additionalTests.forEach(item => {
  console.log(`Original: "${item}" -> Cleaned: "${cleanGroceryItemText(item)}"`);
});

// Test with a sample grocery list
const sampleGroceryList = `
Buy milk
Get eggs
Purchase bread
Pick up cheese
Grab apples
Need to buy bananas
We should get coffee
Don't forget to buy sugar
`;

console.log("\nSample grocery list processing:");
const lines = sampleGroceryList.split('\n').filter(line => line.trim());
lines.forEach(line => {
  console.log(`Original: "${line}" -> Cleaned: "${cleanGroceryItemText(line)}"`);
}); 