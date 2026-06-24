const { throwAppError, ERROR_CODE } = require("./errors");

function parse(spec) {
  const lines = spec
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, "").trim())
    .filter(Boolean);

  if (!lines[0] || !lines[0].startsWith("root ") || !lines[0].endsWith("{")) {
    throw new Error("Invalid VSL spec. Expected 'root {' on first line.");
  }

  const { fields, nextIndex } = parseBlock(lines, 1);
  if (nextIndex !== lines.length) {
    throw new Error("Invalid VSL spec. Unexpected trailing tokens.");
  }

  return { type: "object", fields };
}

function parseBlock(lines, startIndex) {
  const fields = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (line === "}") {
      return { fields, nextIndex: index + 1 };
    }

    if (line.endsWith("{")) {
      const fieldToken = line.slice(0, -1).trim();
      const field = parseFieldToken(fieldToken);
      const nested = parseBlock(lines, index + 1);
      fields.push({ ...field, kind: "object", objectSpec: { type: "object", fields: nested.fields } });
      index = nested.nextIndex;
      continue;
    }

    const parts = line.split(/\s+/);
    if (parts.length < 2) {
      throw new Error(`Invalid VSL line: ${line}`);
    }

    const field = parseFieldToken(parts[0]);
    const typeSpec = parts.slice(1).join(" ");
    fields.push({ ...field, ...parseTypeSpec(typeSpec) });

    index += 1;
  }

  throw new Error("Invalid VSL spec. Missing closing brace.");
}

function parseFieldToken(token) {
  const match = token.match(/^([A-Za-z_][A-Za-z0-9_]*)(\[\])?(\?)?$/);
  if (!match) {
    throw new Error(`Invalid field token: ${token}`);
  }

  return {
    key: match[1],
    isArray: Boolean(match[2]),
    optional: Boolean(match[3]),
  };
}

function parseTypeSpec(typeSpec) {
  const enumMatch = typeSpec.match(/^([A-Za-z_][A-Za-z0-9_]*)\(([^)]+)\)$/);
  if (enumMatch) {
    return {
      kind: "primitive",
      baseType: enumMatch[1],
      constraints: [],
      enums: enumMatch[2].split("|").map((item) => item.trim()),
    };
  }

  const constraintMatch = typeSpec.match(/^([A-Za-z_][A-Za-z0-9_]*)<([^>]+)>$/);
  if (constraintMatch) {
    return {
      kind: "primitive",
      baseType: constraintMatch[1],
      constraints: constraintMatch[2].split("|").map((item) => item.trim()),
      enums: null,
    };
  }

  return {
    kind: "primitive",
    baseType: typeSpec.trim(),
    constraints: [],
    enums: null,
  };
}

function validate(input, parsedSpec) {
  const errors = [];
  const output = validateObject(input, parsedSpec, [], errors);

  if (errors.length > 0) {
    throwAppError("Validation failed", ERROR_CODE.VALIDATIONERR, 400, {
      status: "error",
      message: "Validation failed",
      errors,
    });
  }

  return output;
}

function validateObject(value, spec, path, errors) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    errors.push({ path: path.join("."), message: "must be an object" });
    return {};
  }

  const out = {};

  for (const field of spec.fields) {
    const currentPath = [...path, field.key];
    const currentValue = value[field.key];

    if (currentValue === undefined || currentValue === null) {
      if (!field.optional) {
        errors.push({ path: currentPath.join("."), message: "is required" });
      }
      continue;
    }

    if (field.isArray) {
      if (!Array.isArray(currentValue)) {
        errors.push({ path: currentPath.join("."), message: "must be an array" });
        continue;
      }

      out[field.key] = currentValue.map((item, index) => {
        const arrayPath = [...currentPath, String(index)];
        if (field.kind === "object") {
          return validateObject(item, field.objectSpec, arrayPath, errors);
        }
        return validatePrimitive(item, field, arrayPath, errors);
      });
      continue;
    }

    if (field.kind === "object") {
      out[field.key] = validateObject(currentValue, field.objectSpec, currentPath, errors);
    } else {
      out[field.key] = validatePrimitive(currentValue, field, currentPath, errors);
    }
  }

  return out;
}

function validatePrimitive(value, field, path, errors) {
  let out = value;

  if (field.baseType === "string") {
    if (typeof out !== "string") {
      errors.push({ path: path.join("."), message: "must be a string" });
      return out;
    }

    for (const constraint of field.constraints) {
      const [name, paramsRaw] = constraint.split(":");
      if (name === "trim") {
        out = out.trim();
      }
      if (name === "lowercase") {
        out = out.toLowerCase();
      }
      if (name === "uppercase") {
        out = out.toUpperCase();
      }
      if (name === "minLength") {
        const min = Number(paramsRaw);
        if (out.length < min) {
          errors.push({ path: path.join("."), message: `must be at least ${min} characters` });
        }
      }
      if (name === "maxLength") {
        const max = Number(paramsRaw);
        if (out.length > max) {
          errors.push({ path: path.join("."), message: `must be at most ${max} characters` });
        }
      }
      if (name === "length") {
        const len = Number(paramsRaw);
        if (out.length !== len) {
          errors.push({ path: path.join("."), message: `must be exactly ${len} characters` });
        }
      }
      if (name === "startsWith") {
        if (!out.startsWith(paramsRaw)) {
          errors.push({ path: path.join("."), message: `must start with ${paramsRaw}` });
        }
      }
    }

    if (field.enums && !field.enums.includes(out)) {
      errors.push({ path: path.join("."), message: `must be one of: ${field.enums.join(", ")}` });
    }

    return out;
  }

  if (field.baseType === "number") {
    if (typeof out !== "number" || Number.isNaN(out)) {
      errors.push({ path: path.join("."), message: "must be a number" });
      return out;
    }

    for (const constraint of field.constraints) {
      const [name, paramsRaw] = constraint.split(":");
      if (name === "min") {
        const min = Number(paramsRaw);
        if (out < min) {
          errors.push({ path: path.join("."), message: `must be at least ${min}` });
        }
      }
      if (name === "max") {
        const max = Number(paramsRaw);
        if (out > max) {
          errors.push({ path: path.join("."), message: `must be at most ${max}` });
        }
      }
    }

    return out;
  }

  if (field.baseType === "boolean") {
    if (typeof out !== "boolean") {
      errors.push({ path: path.join("."), message: "must be a boolean" });
    }
    return out;
  }

  return out;
}

module.exports = {
  parse,
  validate,
};
