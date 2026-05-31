import { readFile, writeFile } from "./storage";

const TASK_PATTERN = /^- \[([ xX])\] (.*)$/;

export type MiTodoSectionId = "inbox" | "priority" | "medium" | "low";

export type MiTodoSection = {
  id: MiTodoSectionId;
  label: string;
  title: string;
  heading: string;
};

const TASK_SECTIONS: MiTodoSection[] = [
  { id: "inbox", label: "Inbox", title: "📋 Inbox", heading: "## 📋 Inbox" },
  { id: "priority", label: "Priority", title: "🔴 Priority", heading: "### 🔴 Priority" },
  { id: "medium", label: "Medium", title: "🟡 Medium", heading: "### 🟡 Medium" },
  { id: "low", label: "Low", title: "🟢 Low", heading: "### 🟢 Low" },
];

export type MiTodoTask = {
  line: number;
  text: string;
  completed: boolean;
  section: string;
};

function getTaskLine(lines: string[], line: number): string {
  const original = lines[line];

  if (original === undefined) {
    throw new Error(`Task line ${line} not found`);
  }

  const match = original.match(TASK_PATTERN);
  if (!match) {
    throw new Error(`Line ${line + 1} is not a task`);
  }

  return original;
}

function findSection(sectionId: MiTodoSectionId): MiTodoSection {
  const section = TASK_SECTIONS.find((candidate) => candidate.id === sectionId);
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  return section;
}

export function listTasksInFile(filepath: string): MiTodoTask[] {
  const content = readFile(filepath);
  const lines = content.split("\n");
  const tasks: MiTodoTask[] = [];
  let currentSection = "";

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (/^#{1,6}\s+/.test(trimmed)) {
      currentSection = trimmed.replace(/^#{1,6}\s+/, "");
      return;
    }

    const match = trimmed.match(TASK_PATTERN);
    if (!match) return;

    tasks.push({
      line: index,
      text: match[2],
      completed: match[1].toLowerCase() === "x",
      section: currentSection,
    });
  });

  return tasks;
}

export function listTaskSectionsInFile(filepath: string): MiTodoSection[] {
  const content = readFile(filepath);
  const lines = content.split("\n");

  return TASK_SECTIONS.filter((section) => lines.some((line) => line.trim() === section.heading));
}

export function toggleTaskInFile(filepath: string, line: number): boolean {
  const content = readFile(filepath);
  const lines = content.split("\n");
  const original = getTaskLine(lines, line);
  const match = original.match(TASK_PATTERN);
  if (!match) throw new Error(`Line ${line + 1} is not a task`);

  const nextCompleted = match[1].toLowerCase() !== "x";
  lines[line] = original.replace(TASK_PATTERN, `- [${nextCompleted ? "x" : " "}] $2`);
  writeFile(filepath, lines.join("\n"));

  return nextCompleted;
}

export function moveTaskToSection(
  filepath: string,
  line: number,
  sectionId: MiTodoSectionId,
): string {
  const content = readFile(filepath);
  const lines = content.split("\n");
  const original = getTaskLine(lines, line);
  const section = findSection(sectionId);

  lines.splice(line, 1);

  const headingIndex = lines.findIndex((candidate) => candidate.trim() === section.heading);
  if (headingIndex === -1) {
    throw new Error(`Section not found: ${section.label}`);
  }

  let insertIndex = headingIndex + 1;
  while (insertIndex < lines.length && lines[insertIndex].startsWith("- [")) {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, original);
  writeFile(filepath, lines.join("\n"));

  return section.label;
}
