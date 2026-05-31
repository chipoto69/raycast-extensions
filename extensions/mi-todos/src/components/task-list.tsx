import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ContentDetail } from "./content-detail";
import { MiTodoTask, listTasksInFile, toggleTaskInFile } from "../util/tasks";

type TaskListProps = {
  filepath: string;
  fileName: string;
  onTasksChanged?: () => void | Promise<void>;
};

export function TaskList({ filepath, fileName, onTasksChanged }: TaskListProps) {
  const { push } = useNavigation();
  const {
    data: tasks = [],
    isLoading,
    revalidate,
  } = usePromise(async (path: string) => listTasksInFile(path), [filepath]);

  async function handleToggle(task: MiTodoTask) {
    try {
      const completed = toggleTaskInFile(filepath, task.line);
      await revalidate();
      await onTasksChanged?.();
      await showHUD(`${completed ? "Completed" : "Reopened"}: ${task.text}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Tasks in ${fileName}`}>
      {tasks.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No tasks in this file"
          description="This file does not contain any markdown checkboxes yet"
          actions={
            <ActionPanel>
              <Action
                title="View Content"
                icon={Icon.Eye}
                onAction={() => push(<ContentDetail filepath={filepath} fileName={fileName} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        tasks.map((task) => (
          <List.Item
            key={`${filepath}:${task.line}`}
            icon={task.completed ? Icon.CheckCircle : Icon.Circle}
            title={task.text}
            accessories={task.section ? [{ text: task.section }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={task.completed ? "Reopen Task" : "Complete Task"}
                  icon={task.completed ? Icon.RotateAntiClockwise : Icon.Check}
                  onAction={() => handleToggle(task)}
                />
                <Action
                  title="View Content"
                  icon={Icon.Eye}
                  onAction={() => push(<ContentDetail filepath={filepath} fileName={fileName} />)}
                />
                <Action.CopyToClipboard title="Copy Task" content={task.text} />
                <Action.CopyToClipboard title="Copy Path" content={filepath} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
