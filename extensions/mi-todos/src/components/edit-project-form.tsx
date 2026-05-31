import { Action, ActionPanel, Form, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { renameProjectFile } from "../util/storage";

type EditProjectFormProps = {
  mitodosDir: string;
  currentName: string;
  onProjectChanged?: () => void | Promise<void>;
};

export function EditProjectForm({
  mitodosDir,
  currentName,
  onProjectChanged,
}: EditProjectFormProps) {
  const [name, setName] = useState(currentName);
  const { pop } = useNavigation();

  async function handleSubmit() {
    try {
      const nextName = renameProjectFile(mitodosDir, currentName, name);
      await onProjectChanged?.();
      await showHUD(`Renamed: ${nextName}`);
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to rename project",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle={`Rename ${currentName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Project Name"
        placeholder="Project name"
        value={name}
        onChange={setName}
        autoFocus
      />
    </Form>
  );
}
