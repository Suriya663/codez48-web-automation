// index.js
// Simple greeting function module

/**
 * Returns a greeting message for the given name.
 * @param {string} name - The name to greet.
 * @returns {string} Greeting message.
 */
function greet(name) {
  const trimmedName = name ? name.trim() : "World";
  return `Hello, ${trimmedName}!`;
}

// Export the function for use in other modules
module.exports = { greet };

// If this file is executed directly, demonstrate the greeting
if (require.main === module) {
  const name = process.argv[2] || "World";
  console.log(greet(name));
}
