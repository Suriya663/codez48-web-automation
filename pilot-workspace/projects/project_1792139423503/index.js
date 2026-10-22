// Simple JavaScript program to calculate factorial

function factorial(n) {
  if (n < 0) {
    return undefined; // Factorial is not defined for negative numbers
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Example usage:
const number = 5; // Change this value to compute a different factorial
const fact = factorial(number);
if (fact === undefined) {
  console.log(`Factorial is not defined for ${number}`);
} else {
  console.log(`Factorial of ${number} is ${fact}`);
}
