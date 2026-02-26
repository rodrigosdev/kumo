import { Code, CodeBlock } from "@cloudflare/kumo";

const deploymentRows = Array.from(
  { length: 72 },
  (_, index) =>
    `  { id: ${index + 1}, name: "Worker-${String(index + 1).padStart(2, "0")}", status: "${index % 3 === 0 ? "running" : index % 3 === 1 ? "queued" : "paused"}" },`,
).join("\n");

const scrollableCode = `const veryLongQuery =
  "SELECT id, account_id, region, deployment_status, created_at, updated_at, last_healthcheck_at, runtime_version FROM deployments WHERE account_id = '1234567890' AND deployment_status IN ('running', 'queued', 'failed', 'paused') ORDER BY updated_at DESC LIMIT 500";

const deployments = [
${deploymentRows}
];

function summarize(items: { id: number; name: string; status: string }[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

const totals = summarize(deployments);
console.table(totals);`;

export function CodeDemo() {
  return (
    <CodeBlock
      lang="tsx"
      code={`const greeting = "Hello, World!";
console.log(greeting);`}
    />
  );
}

export function CodeTypeScriptDemo() {
  return (
    <CodeBlock
      lang="tsx"
      code={`interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: "1",
  name: "John Doe",
  email: "john@example.com"
};`}
    />
  );
}

export function CodeBashDemo() {
  return (
    <CodeBlock
      lang="bash"
      code={`npm install @cloudflare/kumo
pnpm add @cloudflare/kumo`}
    />
  );
}

export function CodeJsonDemo() {
  return (
    <CodeBlock
      lang="jsonc"
      code={`{
  "name": "kumo",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0"
  }
}`}
    />
  );
}

export function CodeWithValuesDemo() {
  return (
    <Code
      lang="bash"
      code="export API_KEY={{apiKey}}"
      values={{
        apiKey: { value: "sk_live_123", highlight: true },
      }}
    />
  );
}

export function CodeScrollableDemo() {
  return <CodeBlock lang="ts" code={scrollableCode} />;
}
