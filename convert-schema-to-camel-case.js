#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Convert snake_case to camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Convert snake_case to PascalCase
function snakeToPascal(str) {
  const camel = snakeToCamel(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Get all snake_case model names
const modelMatches = schema.matchAll(/^model\s+([a-z_]+)\s+{/gm);
const snakeCaseModels = [...modelMatches].map(m => m[1]).filter(name => name.includes('_'));

console.log('Found snake_case models:', snakeCaseModels);

// Convert model definitions
for (const modelName of snakeCaseModels) {
  const pascalCase = snakeToPascal(modelName);
  const regex = new RegExp(`^model\\s+${modelName}\\s+{`, 'gm');
  schema = schema.replace(regex, `model ${pascalCase} {`);
  console.log(`  model ${modelName} -> ${pascalCase}`);
}

// Convert relation references (field types)
for (const modelName of snakeCaseModels) {
  const pascalCase = snakeToPascal(modelName);
  // Match field definitions with the model type
  const regex = new RegExp(`(\\s+)${modelName}(\\??)\\s+@relation`, 'g');
  schema = schema.replace(regex, `$1${pascalCase}$2 @relation`);
  console.log(`  field type ${modelName} -> ${pascalCase}`);
}

// Convert @map attributes for table names (keep database names as snake_case)
for (const modelName of snakeCaseModels) {
  const pascalCase = snakeToPascal(modelName);
  const modelRegex = new RegExp(`(model ${pascalCase} {[^}]+)(})`,'gs');
  schema = schema.replace(modelRegex, (match, body, closingBrace) => {
    if (!body.includes('@@map(')) {
      return body + `\n\n  @@map("${modelName}")` + closingBrace;
    }
    return match;
  });
}

// Write the updated schema
fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('\nSchema converted successfully!');
console.log('Run: npx prisma format && npx prisma generate');
