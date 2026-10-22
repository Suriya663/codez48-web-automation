// script.js
// Example JavaScript program demonstrating functions and loops

// Function that prints numbers from 1 to n using a for loop
function printNumbers(n) {
  console.log(`Printing numbers from 1 to ${n}:`);
  for (let i = 1; i <= n; i++) {
    console.log(i);
  }
}

// Function that calculates the factorial of a number using a while loop
function factorial(num) {
  if (num < 0) return undefined; // factorial not defined for negative numbers
  let result = 1;
  let i = 1;
  while (i <= num) {
    result *= i;
    i++;
  }
  return result;
}

// Function that sums the elements of an array using a for...of loop
function sumArray(arr) {
  let sum = 0;
  for (const value of arr) {
    sum += value;
  }
  return sum;
}

// Demo execution
printNumbers(5);
console.log('Factorial of 5 =', factorial(5));
console.log('Sum of [1,2,3,4,5] =', sumArray([1, 2, 3, 4, 5]));
