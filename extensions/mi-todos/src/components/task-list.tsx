import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ContentDetail } from "./content-detail";
import { EditTaskForm } from "./edit-task-form";
import {
  MiTodoTask,
  deleteTaskInFile,
  listTaskSectionsInFile,
  listTasksInFile,
  moveTaskToSection,
  toggleTaskInFile,
} from "../util/tasks";

type TaskListProps = {
  filepath: string;
  fileName: string;
  onTasksChanged?: () => void | Promise<void>;
};

export function TaskList({ filepath, fileName, onTasksChanged }: TaskListProps) {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = usePromise(
    async (path: string) => ({
      tasks: listTasksInFile(path),
      sections: listTaskSectionsInFile(path),
    }),
    [filepath],
  );
  const tasks = data?.tasks ?? [];
  const sections = data?.sections ?? [];

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

  async function handleMove(task: MiTodoTask, sectionId: "inbox" | "priority" | "medium" | "low") {
    try {
      const section = moveTaskToSection(filepath, task.line, sectionId);
      await revalidate();
      await onTasksChanged?.();
      await showHUD(`Moved to ${section}: ${task.text}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to move task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleDelete(task: MiTodoTask) {
    const confirmed = await confirmAlert({
      title: "Delete task",
      message: task.text,
      primaryAction: {
        title: "Delete Task",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
      icon: Icon.Trash,
    });

    if (!confirmed) return;

    try {
      deleteTaskInFile(filepath, task.line);
      await revalidate();
      await onTasksChanged?.();
      await showHUD(`Deleted: ${task.text}`);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
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
                {sections.filter((section) => section.title !== task.section).length > 0 && (
                  <ActionPanel.Submenu title="Move to Section" icon={Icon.ArrowRight}>
                    {sections
                      .filter((section) => section.title !== task.section)
                      .map((section) => (
                        <Action
                          key={section.id}
                          title={section.label}
                          onAction={() => handleMove(task, section.id)}
                        />
                      ))}
                  </ActionPanel.Submenu>
                )}
                <Action
                  title="Edit Task"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <EditTaskForm
                        filepath={filepath}
                        fileName={fileName}
                        task={task}
                        onTaskChanged={async () => {
                          await revalidate();
                          await onTasksChanged?.();
                        }}
                      />,
                    )
                  }
                />
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
                <Action
                  title="Delete Task"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(task)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
