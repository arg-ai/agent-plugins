#!/usr/bin/env node

import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { validateHeaderName, validateHeaderValue } from "node:http";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginRoot = resolve(root, "plugins/arg");
const pluginSchemaPath = resolve(root, "schemas/agent-plugins/1.0.0/plugin.schema.json");
const mcpSchemaPath = resolve(root, "schemas/agent-plugins/1.0.0/mcp.schema.json");
const pluginManifestPath = resolve(pluginRoot, "plugin.json");
const mcpConfigPath = resolve(pluginRoot, "mcp.json");
const skillNamePattern = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,63}$/;
const skillFields = new Set([
  "allowed-tools",
  "compatibility",
  "description",
  "license",
  "metadata",
  "name",
]);

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

function loadJSON(filePath, label) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`${label}: cannot read ${relative(root, filePath)} — ${error.message}`);
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    fail(`${label}: invalid JSON — ${error.message}`);
    return null;
  }
}

function formatSchemaError(error) {
  if (error.keyword === "additionalProperties") {
    return `${error.instancePath || "/"}: ${error.message} "${error.params.additionalProperty}"`;
  }
  return `${error.instancePath || "/"}: ${error.message}`;
}

function validateRegularFile(filePath, label) {
  if (!existsSync(filePath)) {
    fail(`${label}: missing ${relative(root, filePath)}`);
    return false;
  }
  if (!statSync(filePath).isFile()) {
    fail(`${label}: expected a regular file at ${relative(root, filePath)}`);
    return false;
  }
  return validateContainedPath(filePath, label);
}

function validateContainedPath(filePath, label) {
  const resolvedRoot = realpathSync(pluginRoot);
  const resolvedPath = realpathSync(filePath);
  const pathFromRoot = relative(resolvedRoot, resolvedPath);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    fail(`${label}: resolves outside the plugin root`);
    return false;
  }
  return true;
}

function validateSchema(document, schema, label) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (validate(document)) return;

  for (const error of validate.errors ?? []) {
    fail(`${label}: ${formatSchemaError(error)}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function skillFrontmatterProblems(content, skillName) {
  const problems = [];
  content = content.replace(/\r\n/g, "\n");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatterMatch) {
    return ["SKILL.md must start with closed YAML frontmatter"];
  }

  const parsed = parseDocument(frontmatterMatch[1], { uniqueKeys: true });
  if (parsed.errors.length > 0) {
    for (const error of parsed.errors) {
      problems.push(`invalid YAML frontmatter — ${error.message}`);
    }
    return problems;
  }

  const frontmatter = parsed.toJS();
  if (!isObject(frontmatter)) {
    return ["frontmatter must be a mapping"];
  }

  for (const field of Object.keys(frontmatter)) {
    if (!skillFields.has(field)) {
      problems.push(`unsupported frontmatter field "${field}"`);
    }
  }

  if (typeof frontmatter.name !== "string" || !skillNamePattern.test(frontmatter.name)) {
    problems.push("name must be 1–64 lowercase letters, digits, and single hyphens");
  } else if (frontmatter.name !== skillName) {
    problems.push("frontmatter name must match its parent directory");
  }

  if (
    typeof frontmatter.description !== "string" ||
    frontmatter.description.length < 1 ||
    frontmatter.description.length > 1024
  ) {
    problems.push("description must be a non-empty string of at most 1024 characters");
  }

  if (frontmatter.license !== undefined && typeof frontmatter.license !== "string") {
    problems.push("license must be a string");
  }

  if (
    frontmatter.compatibility !== undefined &&
    (typeof frontmatter.compatibility !== "string" ||
      frontmatter.compatibility.length < 1 ||
      frontmatter.compatibility.length > 500)
  ) {
    problems.push("compatibility must be a non-empty string of at most 500 characters");
  }

  if (frontmatter.metadata !== undefined) {
    if (!isObject(frontmatter.metadata)) {
      problems.push("metadata must be a mapping");
    } else {
      for (const [key, value] of Object.entries(frontmatter.metadata)) {
        if (typeof value !== "string") {
          problems.push(`metadata.${key} must be a string`);
        }
      }
    }
  }

  if (frontmatter["allowed-tools"] !== undefined && typeof frontmatter["allowed-tools"] !== "string") {
    problems.push("allowed-tools must be a space-separated string");
  }

  return problems;
}

function validateSkill(skillDir, skillName) {
  const skillPath = resolve(skillDir, "SKILL.md");
  if (!existsSync(skillPath)) return;
  if (!validateRegularFile(skillPath, `Skill "${skillName}"`)) return;

  const content = readFileSync(skillPath, "utf8");
  for (const problem of skillFrontmatterProblems(content, skillName)) {
    fail(`Skill "${skillName}": ${problem}`);
  }
}

function validateSkills() {
  const skillsDir = resolve(pluginRoot, "skills");
  if (!existsSync(skillsDir)) return;
  if (!statSync(skillsDir).isDirectory()) {
    fail("Skills: plugins/arg/skills exists but is not a directory");
    return;
  }
  if (!validateContainedPath(skillsDir, "Skills")) return;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    const skillDir = resolve(skillsDir, entry.name);
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    if (!statSync(skillDir).isDirectory()) continue;
    validateSkill(skillDir, entry.name);
  }
}

function pathEscapesRoot(value) {
  const parts = value.replaceAll("\\", "/").split("/");
  let depth = 0;
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      depth--;
      if (depth < 0) return true;
    } else {
      depth++;
    }
  }
  return false;
}

export function stdioServerProblems(server) {
  const problems = [];
  const command = server.command;
  if (/\s/.test(command)) {
    problems.push("command must be one executable token");
  } else if (command.startsWith("./")) {
    if (pathEscapesRoot(command.slice(2))) {
      problems.push("command must remain within the plugin root");
    }
  } else if (command.includes("/") || command.includes("\\")) {
    problems.push('command must be a bare executable name or begin with "./"');
  }

  if (server.cwd === undefined) return problems;
  const cwd = server.cwd;
  const prefixes = ["./", "${PLUGIN_ROOT}", "${PLUGIN_DATA}"];
  const prefix = prefixes.find((candidate) => cwd === candidate || cwd.startsWith(`${candidate}/`));
  if (!prefix) {
    problems.push("cwd must be plugin-relative or rooted at PLUGIN_ROOT or PLUGIN_DATA");
    return problems;
  }

  const suffix = cwd.slice(prefix.length).replace(/^\//, "");
  if (pathEscapesRoot(suffix)) {
    problems.push("cwd must remain within its declared root");
  }
  return problems;
}

function isLoopbackHost(hostname) {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

export function remoteServerProblems(server) {
  const problems = [];
  let endpoint;
  try {
    endpoint = new URL(server.url);
  } catch {
    return ["url must be an absolute HTTP or HTTPS URL"];
  }

  if (!["http:", "https:"].includes(endpoint.protocol)) {
    problems.push("url must use HTTP or HTTPS");
  }
  if (endpoint.username || endpoint.password) {
    problems.push("url must not contain user information");
  }
  if (endpoint.hash) {
    problems.push("url must not contain a fragment");
  }
  if (endpoint.protocol !== "https:" && !isLoopbackHost(endpoint.hostname)) {
    problems.push("non-loopback URLs must use HTTPS");
  }

  const headerNames = new Set();
  for (const [name, value] of Object.entries(server.headers ?? {})) {
    const normalized = name.toLowerCase();
    if (headerNames.has(normalized)) {
      problems.push(`duplicate header name ignoring case — ${name}`);
    }
    // Reuse the runtime's RFC-aware parser so this check cannot drift into a
    // subtly different header grammar from the HTTP client that sends it.
    try {
      validateHeaderName(name);
    } catch {
      problems.push(`invalid HTTP header name — ${name}`);
    }
    try {
      validateHeaderValue(name, value);
    } catch {
      problems.push(`invalid HTTP header value — ${name}`);
    }
    headerNames.add(normalized);
  }
  return problems;
}

function validateMcpSemantics(mcpConfig) {
  for (const [name, server] of Object.entries(mcpConfig.mcpServers ?? {})) {
    const label = `MCP server "${name}"`;
    let problems = [];
    if (server.type === "stdio") {
      problems = stdioServerProblems(server);
    } else if (server.type === "streamable-http" || server.type === "sse") {
      problems = remoteServerProblems(server);
    }
    for (const problem of problems) {
      fail(`${label}: ${problem}`);
    }
  }
}

function main() {
  validateRegularFile(pluginManifestPath, "Plugin manifest");
  validateRegularFile(mcpConfigPath, "MCP configuration");

  const pluginManifest = loadJSON(pluginManifestPath, "Plugin manifest");
  const mcpConfig = loadJSON(mcpConfigPath, "MCP configuration");
  const pluginSchema = loadJSON(pluginSchemaPath, "Vendored plugin schema");
  const mcpSchema = loadJSON(mcpSchemaPath, "Vendored MCP schema");

  if (pluginManifest && pluginSchema) {
    validateSchema(pluginManifest, pluginSchema, "Plugin manifest");
  }
  if (mcpConfig && mcpSchema) {
    validateSchema(mcpConfig, mcpSchema, "MCP configuration");
    validateMcpSemantics(mcpConfig);
  }
  validateSkills();

  if (errors > 0) {
    console.error(`\nAgent Plugins validation failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log("Agent Plugins 1.0.0 validation passed.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
