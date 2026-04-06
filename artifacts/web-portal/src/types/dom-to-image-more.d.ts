declare module "dom-to-image-more" {
  interface Options {
    bgcolor?: string;
    width?: number;
    height?: number;
    scale?: number;
    style?: Partial<CSSStyleDeclaration>;
    filter?: (node: Node) => boolean;
    cacheBust?: boolean;
  }
  const domtoimage: {
    toPng(node: Node, options?: Options): Promise<string>;
    toJpeg(node: Node, options?: Options): Promise<string>;
    toBlob(node: Node, options?: Options): Promise<Blob>;
    toSvg(node: Node, options?: Options): Promise<string>;
  };
  export default domtoimage;
}
