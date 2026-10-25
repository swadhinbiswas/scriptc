export class Crate {
  readonly label: string;
  contents: any;
  constructor(label: string) {
    this.label = label;
    this.contents = undefined;
  }
}
