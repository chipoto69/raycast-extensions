import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export function expandHome(filepath: string): string {
  if (filepath.startsWith("~")) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

export function resolvePath(base: string): string {
  return path.resolve(expandHome(base));
}

export function ensureDir(dirPath: string): void {
  const resolved = resolvePath(dirPath);
  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }
}

export function fileExists(filepath: string): boolean {
  return fs.existsSync(resolvePath(filepath));
}

export function readFile(filepath: string): string {
  return fs.readFileSync(resolvePath(filepath), "utf-8");
}

export function writeFile(filepath: string, content: string): void {
  const resolved = resolvePath(filepath);
  ensureDir(path.dirname(resolved));
  fs.writeFileSync(resolved, content, "utf-8");
}

export function appendFile(filepath: string, content: string): void {
  const resolved = resolvePath(filepath);
  ensureDir(path.dirname(resolved));
  fs.appendFileSync(resolved, content, "utf-8");
}

export function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function slugifyProjectName(projectName: string): string {
  return projectName.trim().toLowerCase().replace(/\s+/g, "-");
}

const INBOX_HEADING = "## 📋 Inbox";
const TASKS_HEADING = "## 📁 Tasks";

const INBOX_TEMPLATE = `# MiToDos — Inbox

> Quick capture. Sort later.

${INBOX_HEADING}

`;

const PROJECT_TEMPLATE = `# MiToDos — {{name}}

> Created {{date}}

${INBOX_HEADING}

${TASKS_HEADING}

### 🔴 Priority

### 🟡 Medium

### 🟢 Low

## 📊 Notes
`;

export function appendToInbox(mitodosDir: string, task: string): string {
  const inboxPath = path.join(resolvePath(mitodosDir), "inbox.md");

  if (!fs.existsSync(inboxPath)) {
    writeFile(inboxPath, INBOX_TEMPLATE);
  }

  const content = readFile(inboxPath);
  const taskLine = `- [ ] ${task}\n`;

  if (content.includes(INBOX_HEADING)) {
    const lines = content.split("\n");
    const inboxIndex = lines.findIndex((l: string) => l.trim() === INBOX_HEADING);
    let insertIndex = inboxIndex + 1;
    while (insertIndex < lines.length && lines[insertIndex].startsWith("- [")) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, taskLine.trimEnd());
    writeFile(inboxPath, lines.join("\n"));
  } else {
    appendFile(inboxPath, `\n${INBOX_HEADING}\n${taskLine}`);
  }

  return task;
}

export function createProjectFile(mitodosDir: string, projectName: string): string {
  const dir = resolvePath(mitodosDir);
  ensureDir(dir);

  const filename = `${slugifyProjectName(projectName)}.md`;
  const filepath = path.join(dir, filename);

  if (fs.existsSync(filepath)) {
    throw new Error(`Already exists: ${filename}`);
  }

  const content = PROJECT_TEMPLATE.replace("{{name}}", projectName).replace(
    "{{date}}",
    todayDate(),
  );
  writeFile(filepath, content);

  return filepath;
}

export function renameProjectFile(
  mitodosDir: string,
  currentName: string,
  nextName: string,
): string {
  const dir = resolvePath(mitodosDir);
  const trimmed = nextName.trim();
  if (!trimmed) {
    throw new Error("Project name cannot be empty");
  }

  const currentPath = path.join(dir, `${currentName}.md`);
  if (!fs.existsSync(currentPath)) {
    throw new Error(`Project not found: ${currentName}`);
  }

  const nextSlug = slugifyProjectName(trimmed);
  const nextPath = path.join(dir, `${nextSlug}.md`);
  if (nextPath !== currentPath && fs.existsSync(nextPath)) {
    throw new Error(`Already exists: ${nextSlug}.md`);
  }

  const content = readFile(currentPath);
  const nextContent = content.replace(/^# MiToDos — .*/m, `# MiToDos — ${trimmed}`);
  writeFile(currentPath, nextContent);

  if (nextPath !== currentPath) {
    fs.renameSync(currentPath, nextPath);
  }

  return nextSlug;
}

export function deleteProjectFile(mitodosDir: string, projectName: string): void {
  if (projectName === "inbox") {
    throw new Error("Inbox cannot be deleted");
  }

  const dir = resolvePath(mitodosDir);
  const filepath = path.join(dir, `${projectName}.md`);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Project not found: ${projectName}`);
  }

  fs.unlinkSync(filepath);
}

export function listProjectFiles(mitodosDir: string): string[] {
  const dir = resolvePath(mitodosDir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f: string) => f.endsWith(".md"))
    .map((f: string) => f.replace(".md", ""));
}
