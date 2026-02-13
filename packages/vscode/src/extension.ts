import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem | undefined;

export function activate(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  context.subscriptions.push(statusBarItem);
  statusBarItem.text = "$(run) Relay";
  statusBarItem.tooltip = "Relay — dev workflow";
  statusBarItem.show();

  context.subscriptions.push(
    vscode.commands.registerCommand("relay.checkin", () => runRelayCommand("checkin")),
    vscode.commands.registerCommand("relay.startTask", () => runRelayCommand("start")),
    vscode.commands.registerCommand("relay.updateProgress", () => runRelayCommand("update")),
    vscode.commands.registerCommand("relay.completeTask", () => runRelayCommand("complete")),
    vscode.commands.registerCommand("relay.createHandoff", () => runRelayCommand("handoff")),
    vscode.commands.registerCommand("relay.endOfDay", () => runRelayCommand("eod"))
  );
}

function runRelayCommand(cmd: string): void {
  const config = vscode.workspace.getConfiguration("relay");
  const relayPath = config.get<string>("mcpPath", "relay-mcp");
  const terminal = vscode.window.createTerminal({ name: "Relay", hideFromUser: false });
  terminal.show();
  if (cmd === "start") {
    terminal.sendText("relay start PROJ-42"); // Placeholder — in real impl, prompt for issue key
  } else {
    terminal.sendText(`relay ${cmd}`);
  }
}

export function deactivate(): void {
  statusBarItem?.dispose();
}
