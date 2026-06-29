---
name: Zod coerce boolean query params
description: zod.coerce.boolean() treats any non-empty string as true — including "false"
---

`z.coerce.boolean()` uses `Boolean(value)` internally. `Boolean("false") === true` in JavaScript, so query string `?archived=false` would be coerced to `true`, breaking all boolean filter params.

**Why:** This is a known JavaScript behavior — any non-empty string is truthy.

**How to apply:** For query string boolean params, parse the raw string directly instead of using Zod coerce:
```ts
// WRONG — zod.coerce.boolean() in schema, then:
const archived = params.data.archived === true; // "false" → coerced to true

// CORRECT — bypass coercion, read raw string:
const archived = req.query.archived === "true";
```

This applies to any boolean query param in Express routes where the value comes from a URL query string.
