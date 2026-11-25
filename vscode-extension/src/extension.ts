import * as vscode from "vscode";

/** 只提供界面装饰，不修改文件名或内容。 */
export class SvgFileDecorationProvider implements vscode.FileDecorationProvider {
  public async provideFileDecoration(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<vscode.FileDecoration | undefined> {
    if (!uri.path.toLowerCase().endsWith(".svg") || token.isCancellationRequested) {
      return undefined;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      // 目录即使以 .svg 结尾，也不能获得标记。
      if ((stat.type & vscode.FileType.File) === 0 || token.isCancellationRequested) {
        return undefined;
      }

      const decoration = new vscode.FileDecoration("[]", "SVG 文件");
      decoration.propagate = false;
      return decoration;
    } catch {
      // 文件可能刚被删除，或暂时无法访问。
      return undefined;
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(new SvgFileDecorationProvider()),
  );
}
