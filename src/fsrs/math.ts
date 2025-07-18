/**
 * Generic math operations interface that abstracts mathematical operations
 * for both standard numbers and tensors (TensorFlow.js)
 */
export interface IMath<T> {
  // Basic arithmetic operations
  add(a: T, b: T | number): T
  sub(a: T, b: T | number): T
  mul(a: T, b: T | number): T
  div(a: T, b: T | number): T
  pow(base: T, exp: T | number): T
  exp(t: T): T
  log(t: T): T
  max(a: T, b: T | number): T
  min(a: T, b: T | number): T
  clip(val: T, min: number, max: number): T
  
  // Conversion methods
  toTensor(n: number): T
  toTensorArray(arr: number[] | readonly number[]): T[]
  
  // Utility methods for optimization
  toNumber(t: T): number
  toNumberArray(arr: T[]): number[]
}

/**
 * Standard JavaScript Math implementation for regular numbers
 */
export class NumberMath implements IMath<number> {
  add(a: number, b: number): number {
    return a + b
  }

  sub(a: number, b: number): number {
    return a - b
  }

  mul(a: number, b: number): number {
    return a * b
  }

  div(a: number, b: number): number {
    return a / b
  }

  pow(base: number, exp: number): number {
    return Math.pow(base, exp)
  }

  exp(t: number): number {
    return Math.exp(t)
  }

  log(t: number): number {
    return Math.log(t)
  }

  max(a: number, b: number): number {
    return Math.max(a, b)
  }

  min(a: number, b: number): number {
    return Math.min(a, b)
  }

  clip(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max)
  }

  toTensor(n: number): number {
    return n
  }

  toTensorArray(arr: number[] | readonly number[]): number[] {
    return [...arr]
  }

  toNumber(t: number): number {
    return t
  }

  toNumberArray(arr: number[]): number[] {
    return arr
  }
}