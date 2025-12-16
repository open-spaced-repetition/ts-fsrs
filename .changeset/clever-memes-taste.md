---
"@open-spaced-repetition/binding": minor
---

refactor(binding): refactor progress callback to support training interruption

BREAKING CHANGES: 
- progress callback no longer supports async functions, because call_with_return_value does not support asynchronous execution. See Node.js N-API documentation: https://nodejs.org/api/n-api.html#n_api_napi_call_threadsafe_function
