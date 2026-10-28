export type EnvType = "string" | "number" | "boolean";

export interface EnvRule {
  type?: EnvType;
  required?: boolean;
  choices?: readonly any[];
  default?: any;
}

export type EnvSchema<T> = {
  [K in keyof T]: EnvType | EnvRule;
};

export type InferEnv<T extends EnvSchema<any>> = {
  [K in keyof T]: T[K] extends "number"
    ? number
    : T[K] extends "boolean"
      ? boolean
      : T[K] extends "string"
        ? string
        : T[K] extends { type: "number" }
          ? number
          : T[K] extends { type: "boolean" }
            ? boolean
            : string;
};

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

/**
 * Validates and parses environment variables against a provided schema.
 */
export function validateEnv<T extends EnvSchema<any>>(schema: T): InferEnv<T> {
  const errors: string[] = [];
  const validatedEnv: Record<string, any> = { ...process.env };

  console.log(`${CYAN}[EnvGuard] Validating environment variables...${RESET}`);

  for (const key of Object.keys(schema)) {
    const ruleInput = schema[key];
    const rule: EnvRule =
      typeof ruleInput === "string"
        ? { type: ruleInput, required: true }
        : { required: true, ...ruleInput };

    const rawValue = process.env[key];
    const isMissing = rawValue === undefined || rawValue.trim() === "";

    if (isMissing) {
      if (rule.default !== undefined) {
        validatedEnv[key] = rule.default;
        continue;
      }
      if (rule.required !== false) {
        errors.push(
          `Missing required environment variable: ${RED}${key}${RESET}`,
        );
      }
      continue;
    }

    let parsedValue: any = rawValue;

    if (rule.type === "number") {
      const num = Number(rawValue);
      if (isNaN(num)) {
        errors.push(
          `Environment variable ${RED}${key}${RESET} must be a valid number, got "${RED}${rawValue}${RESET}"`,
        );
      } else {
        parsedValue = num;
      }
    } else if (rule.type === "boolean") {
      if (rawValue === "true" || rawValue === "1") {
        parsedValue = true;
      } else if (rawValue === "false" || rawValue === "0") {
        parsedValue = false;
      } else {
        errors.push(
          `Environment variable ${RED}${key}${RESET} must be a boolean ('true'/'false' or '1'/'0'), got "${RED}${rawValue}${RESET}"`,
        );
      }
    }

    if (rule.choices && !rule.choices.includes(parsedValue)) {
      errors.push(
        `Environment variable ${RED}${key}${RESET} must be one of [${YELLOW}${rule.choices.join(", ")}${RESET}], got "${RED}${rawValue}${RESET}"`,
      );
    }

    validatedEnv[key] = parsedValue;
  }

  if (errors.length > 0) {
    console.error(`\n${RED}❌ Environment Validation Failed:${RESET}`);
    errors.forEach((err) => console.error(`  • ${err}`));
    console.error("");
    process.exit(1);
  }

  console.log(
    `${GREEN}✔ Environment validation passed successfully!${RESET}\n`,
  );
  return validatedEnv as InferEnv<T>;
}
