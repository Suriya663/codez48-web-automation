// index.js
// Simple JavaScript program that showcases functions and loops.

// Function to calculate factorial of a number using a loop
function factorial(n) {
  if (n < 0) return undefined; // factorial not defined for negative numbers
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Function to generate an array of the first `count` Fibonacci numbers
function fibonacci(count) {
  const seq = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) seq.push(0);
    else if (i === 1) seq.push(1);
    else seq.push(seq[i - 1] + seq[i - 2]);
  }
  return seq;
}

// Function to print numbers from 1 to `limit` using a while loop
function printNumbers(limit) {
  let i = 1;
  while (i <= limit) {
    console.log(i);
    i++;
  }
}

// Demonstration of the functions
console.log('Factorial of 5:', factorial(5)); // 120
console.log('First 10 Fibonacci numbers:', fibonacci(10));
console.log('Printing numbers from 1 to 7:');
printNumbers(7);
