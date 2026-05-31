import { Action, ActionPanel, Detail } from "@raycast/api";
import { readFile } from "../util/storage";

export function ContentDetail({ filepath, fileName }: { filepath: string; fileName: string }) {
  let content = "(file not readable)";
  try {
    content = readFile(filepath);
  } catch {
    // keep fallback
  }

  return (
    <Detail
      markdown={`# ${fileName}\n\n\`\`\`markdown\n${content.slice(0, 5000)}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Path" content={filepath} />
          <Action.CopyToClipboard title="Copy Content" content={content} />
        </ActionPanel>
      }
    />
  );
}
