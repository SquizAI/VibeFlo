// Enhanced function to clean grocery item text
function cleanGroceryItemText(text) {
  // First handle prefixes (most common case)
  let cleaned = text.replace(/^(buy|get|purchase|pick up|grab)(\s+)/i, '');
  
  // Handle phrases like "need to buy X", "don't forget to get X", etc.
  cleaned = cleaned.replace(/(need to|don't forget to|remember to|we should|should|have to)\s+(buy|get|purchase|pick up|grab)\s+/i, '');
  
  // Handle "add X to the grocery/shopping list"
  cleaned = cleaned.replace(/^add\s+(.+)\s+to\s+(the\s+)?(grocery|shopping)(\s+list)?$/i, '$1');
  
  // Capitalize first letter if it's lowercase after cleaning
  if (cleaned.length > 0 && cleaned[0] !== cleaned[0].toUpperCase()) {
    cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

// Test with some examples
const testCases = [
  "buy milk",
  "get eggs",
  "purchase bread",
  "pick up cheese",
  "grab apples",
  "Buy cereal",
  "GET yogurt",
  "PURCHASE pasta",
  "milk", // Already clean
  "2 gallons of milk", // No prefix
  "buy 2 gallons of milk", // With quantity
  "need to buy bananas", // Middle of text
  "we should get cheese", // Middle of text
  "don't forget to buy coffee", // Middle of text
  "remember to get sugar", // Middle of text
  "have to buy flour", // Middle of text
  "add tomatoes to the grocery list", // Add to list format
  "add pasta to shopping list", // Add to list format
  "add 2 pounds of ground beef to the shopping list" // Add to list with quantity
];

console.log("Testing enhanced grocery item cleaning:");
testCases.forEach(item => {
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
Remember to get flour
Have to buy pasta
Add tomatoes to the grocery list
Add 2 pounds of ground beef to the shopping list
`;

console.log("\nSample grocery list processing:");
const lines = sampleGroceryList.split('\n').filter(line => line.trim());
lines.forEach(line => {
  console.log(`Original: "${line}" -> Cleaned: "${cleanGroceryItemText(line)}"`);
}); 