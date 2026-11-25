import * as vscode from "vscode";
import { SvgOutlineNode, SvgOutlineParser } from "./SvgOutlineParser";

export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  private readonly parser = new SvgOutlineParser();

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    const nodes = this.parser.parse(document.getText());
    if (token.isCancellationRequested) return [];
    return nodes.map((node) => this.toSymbol(node, document));
  }

  private toSymbol(node: SvgOutlineNode, document: vscode.TextDocument): vscode.DocumentSymbol {
    const symbol = new vscode.DocumentSymbol(
      node.name,
      "",
      vscode.SymbolKind.Object,
      new vscode.Range(document.positionAt(node.start), document.positionAt(node.end)),
      new vscode.Range(document.positionAt(node.nameStart), document.positionAt(node.nameEnd)),
    );
    symbol.children = node.children.map((child) => this.toSymbol(child, document));
    return symbol;
  }
}
