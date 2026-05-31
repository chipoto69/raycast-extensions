import { Action, ActionPanel, Form, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { MiTodoTask, updateTaskTextInFile } from "../util/tasks";

type EditTaskFormProps = {
  filepath: string;
  fileName: string;
  task: MiTodoTask;
  onTaskChanged?: () => void | Promise<void>;
};

export function EditTaskForm({ filepath, fileName, task, onTaskChanged }: EditTaskFormProps) {
  const [text, setText] = useState(task.text);
  const { pop } = useNavigation();

  async function handleSubmit() {
    try {
      const updated = updateTaskTextInFile(filepath, task.line, text);
      await onTaskChanged?.();
      await showHUD(`Updated: ${updated}`);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${fileName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Section" text={task.section || "Unsectioned"} />
      <Form.TextArea
        id="text"
        title="Task"
        placeholder="What needs doing?"
        value={text}
        onChange={setText}
        autoFocus
      />
    </Form>
  );
}
