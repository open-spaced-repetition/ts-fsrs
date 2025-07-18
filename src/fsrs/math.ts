import type * as tf from '@tensorflow/tfjs';

/**
 * Generic math operations interface that abstracts mathematical operations
 * for both standard numbers and tensors (TensorFlow.js).
 * This is the core of the generic algorithm architecture.
 */
export interface IMath<T> {
  // Basic arithmetic operations
  add(a: T, b: T | number): T;
  sub(a: T, b: T | number): T;
  mul(a: T, b: T | number): T;
  div(a: T, b: T | number): T;
  pow(base: T, exp: number): T; // Exponent is always a number
  exp(t: T): T;
  log(t: T): T;
  max(a: T, b: T | number): T;
  min(a: T, b: T | number): T;
  clip(val: T, min: number, max: number): T;

  // Conversion methods
  toTensor(n: number): T;
  toTensorArray(arr: number[] | readonly number[]): T[];

  // Utility methods for retrieving data from the generic type
  toNumber(t: T): number;
  toNumberArray(arr: T[]): number[];
}

/**
 * Standard JavaScript Math implementation for regular numbers.
 * This ensures the core library functions exactly as before without any
 * performance overhead or new dependencies.
 */
export class NumberMath implements IMath<number> {
  add = (a: number, b: number): number => a + b;
  sub = (a: number, b: number): number => a - b;
  mul = (a: number, b: number): number => a * b;
  div = (a: number, b: number): number => a / b;
  pow = (base: number, exp: number): number => Math.pow(base, exp);
  exp = (t: number): number => Math.exp(t);
  log = (t: number): number => Math.log(t);
  max = (a: number, b: number): number => Math.max(a, b);
  min = (a: number, b: number): number => Math.min(a, b);
  clip = (val: number, min: number, max: number): number => Math.min(Math.max(val, min), max);
  toTensor = (n: number): number => n;
  toTensorArray = (arr: number[] | readonly number[]): number[] => [...arr];
  toNumber = (t: number): number => t;
  toNumberArray = (arr: number[]): number[] => arr;
}

/**
 * TensorFlow.js Math implementation for tensor operations.
 * This class is internal to the optimizer and wraps all tfjs math functions.
 */
export class TfMath implements IMath<tf.Tensor> {
  constructor(private tfjs: typeof tf) {}

  add = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.add(a, b);
  sub = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.sub(a, b);
  mul = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.mul(a, b);
  div = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.div(a, b);
  pow = (base: tf.Tensor, exp: number): tf.Tensor => this.tfjs.pow(base, exp);
  exp = (t: tf.Tensor): tf.Tensor => this.tfjs.exp(t);
  log = (t: tf.Tensor): tf.Tensor => this.tfjs.log(t);
  max = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.maximum(a, b);
  min = (a: tf.Tensor, b: tf.Tensor | number): tf.Tensor => this.tfjs.minimum(a, b);
  clip = (val: tf.Tensor, min: number, max: number): tf.Tensor => this.tfjs.clipByValue(val, min, max);
  toTensor = (n: number): tf.Tensor => this.tfjs.scalar(n);
  toTensorArray = (arr: number[] | readonly number[]): tf.Tensor[] => arr.map(n => this.tfjs.scalar(n));
  toNumber = (t: tf.Tensor): number => t.dataSync()[0];
  toNumberArray = (arr: tf.Tensor[]): number[] => arr.map(t => this.toNumber(t));
}