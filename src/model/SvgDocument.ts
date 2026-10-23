export class SvgDocument {
  private width: number;
  private height: number;

  public constructor(width = 800, height = 600) {
    this.validateSize(width, height);
    this.width = width;
    this.height = height;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public resize(width: number, height: number): void {
    // 先全部校验，再修改，确保失败时原状态不变。
    this.validateSize(width, height);
    this.width = width;
    this.height = height;
  }

  private validateSize(width: number, height: number): void {
    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error("canvas dimensions must be positive finite numbers");
    }
  }
}