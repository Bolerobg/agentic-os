#!/usr/bin/env python3
"""
Simple Calculator with add, subtract, multiply, divide functions.
"""

def add(a, b):
    """Return the sum of a and b."""
    return a + b

def subtract(a, b):
    """Return the difference of a minus b."""
    return a - b

def multiply(a, b):
    """Return the product of a and b."""
    return a * b

def divide(a, b):
    """Return the quotient of a divided by b. Raises ValueError if b is zero."""
    if b == 0:
        raise ValueError("Division by zero is not allowed.")
    return a / b