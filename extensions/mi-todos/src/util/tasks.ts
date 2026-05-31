import { readFile, writeFile } from "./storage";

const TASK_PATTERN = /^- \[([ xX])\] (.*)$/;

export type MiTodoTask = {
  line: number;
  text: string;
  completed: boolean;
  section: string;
};

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

export function toggleTaskInFile(filepath: string, line: number): boolean {
  const content = readFile(filepath);
  const lines = content.split("\n");
  const original = lines[line];

  if (original === undefined) {
    throw new Error(`Task line ${line} not found`);
  }

  const match = original.match(TASK_PATTERN);
  if (!match) {
    throw new Error(`Line ${line + 1} is not a task`);
  }

  const nextCompleted = match[1].toLowerCase() !== "x";
  lines[line] = original.replace(TASK_PATTERN, `- [${nextCompleted ? "x" : " "}] $2`);
  writeFile(filepath, lines.join("\n"));

  return nextCompleted;
}
