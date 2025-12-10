---
tags:
  - fastify
---
# Fastify Schemas Deep Dive

Schemas in Fastify use **JSON Schema** format. They serve three purposes:
1. **Validate** incoming data
2. **Serialize** outgoing data (faster responses)
3. **Generate** API documentation (OpenAPI/Swagger)

## Schema Structure

```typescript
const routeSchema = {
  schema: {
    body: { /* validates request body */ },
    querystring: { /* validates URL params like ?page=1 */ },
    params: { /* validates route params like /users/:id */ },
    headers: { /* validates HTTP headers */ },
    response: {
      200: { /* serializes successful responses */ },
      400: { /* error responses */ }
    }
  }
};
```

## Basic Types

```typescript
{
  type: 'string'    // text
  type: 'number'    // integers and floats
  type: 'integer'   // only whole numbers
  type: 'boolean'   // true/false
  type: 'array'     // lists
  type: 'object'    // objects with properties
  type: 'null'      // null value
}
```

## String Validation

```typescript
{
  type: 'string',
  minLength: 3,
  maxLength: 50,
  pattern: '^[a-zA-Z]+$',  // regex
  format: 'email',          // built-in formats
  // formats: email, uri, date-time, date, time, uuid, ipv4, ipv6
  enum: ['admin', 'user', 'guest']  // only these values
}
```

## Number Validation

```typescript
{
  type: 'number',
  minimum: 0,
  maximum: 100,
  exclusiveMinimum: 0,    // > 0 (not >= 0)
  exclusiveMaximum: 100,  // < 100 (not <= 100)
  multipleOf: 5           // must be divisible by 5
}
```

## Object Schemas

```typescript
{
  type: 'object',
  required: ['name', 'email'],  // these fields are mandatory
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    age: { type: 'integer', minimum: 0 },
    bio: { type: 'string' }  // optional since not in 'required'
  },
  additionalProperties: false  // reject extra fields not in properties
}
```

## Array Schemas

```typescript
// Simple array
{
  type: 'array',
  items: { type: 'string' },  // array of strings
  minItems: 1,
  maxItems: 10,
  uniqueItems: true  // no duplicates
}

// Array of objects
{
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' }
    }
  }
}
```

## Nested Objects

```typescript
{
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' }
          }
        }
      }
    }
  }
}
```

## Complete Example: User Registration

```typescript
const registerSchema = {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 50
        },
        email: {
          type: 'string',
          format: 'email'
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 100
        },
        avatar: {
          type: 'string',
          format: 'uri'
        },
        age: {
          type: 'integer',
          minimum: 18,
          maximum: 120
        },
        roles: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['admin', 'user', 'moderator']
          },
          default: ['user']
        }
      },
      additionalProperties: false
    },
    response: {
      201: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }
};
```

## Query String Schema

```typescript
const getUsersSchema = {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        page: {
          type: 'integer',
          minimum: 1,
          default: 1
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        },
        search: { type: 'string' },
        sortBy: {
          type: 'string',
          enum: ['name', 'email', 'createdAt']
        }
      }
    }
  }
};

// URL: /users?page=2&limit=20&search=bat&sortBy=name
```

## Route Params Schema

```typescript
const getUserByIdSchema = {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          pattern: '^[0-9]+$'  // numeric string
        }
      }
    }
  }
};

// Route: /users/:id
```

## Reusable Schemas (DRY)

```typescript
// Define once
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' }
  }
};

// Reuse in multiple routes
const getUserSchema = {
  schema: {
    response: {
      200: userSchema
    }
  }
};

const getUsersSchema = {
  schema: {
    response: {
      200: {
        type: 'array',
        items: userSchema
      }
    }
  }
};
```

## Adding Shared Schemas to Fastify

```typescript
// Register schemas once
fastify.addSchema({
  $id: 'user',
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    email: { type: 'string' }
  }
});

// Reference by $id
const routeSchema = {
  schema: {
    response: {
      200: { $ref: 'user#' }  // reference the 'user' schema
    }
  }
};
```

## anyOf / oneOf / allOf (Advanced)

```typescript
// oneOf: exactly one must match
{
  oneOf: [
    { type: 'string' },
    { type: 'number' }
  ]
}

// anyOf: at least one must match
{
  anyOf: [
    { type: 'string', minLength: 5 },
    { type: 'string', pattern: '^[A-Z]' }
  ]
}

// allOf: all must match (combine schemas)
{
  allOf: [
    { type: 'object', properties: { name: { type: 'string' } } },
    { type: 'object', properties: { age: { type: 'number' } } }
  ]
}
```

## Tips

1. **Use `additionalProperties: false`** to reject unexpected fields
2. **Response schemas speed up serialization** (Fastify skips JSON.stringify validation)
3. **Start simple, add constraints as needed** - don't over-validate initially
4. **Use shared schemas** for consistency across routes
5. **Default values** work in querystring but not body (security)

Want to explore specific validation scenarios, error handling with schemas, or how to integrate these with your User class?