import {
  defineGeistdocsSourceConfig,
  geistdocsFrontmatterSchema,
  geistdocsMetaSchema,
} from "@vercel/geistdocs/source-config";
import { defineDocs, type DefaultMDXOptions } from "fumadocs-mdx/config";
import { partialsLastModified } from "./src/lib/partials-last-modified";
import { headingId, remarkDocsConventions } from "./src/lib/remark-docs";
import { docsShikiTheme } from "./src/lib/shiki-theme";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: geistdocsFrontmatterSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: geistdocsMetaSchema },
});

const config = defineGeistdocsSourceConfig({
  plugins: [partialsLastModified()],
  mdxOptions: {
    remarkHeadingOptions: { slug: (_root, _heading, text) => headingId(text) },
    remarkPlugins: [remarkDocsConventions],
    remarkStructureOptions: {
      types: ["heading", "paragraph", "blockquote", "tableCell", "mdxJsxFlowElement", "mdxJsxTextElement", "text", "inlineCode", "code"],
    },
  },
});
const mdxOptions = config.mdxOptions as DefaultMDXOptions;

export default {
  ...config,
  mdxOptions: {
    ...mdxOptions,
    rehypeCodeOptions: {
      ...mdxOptions.rehypeCodeOptions,
      themes: { light: docsShikiTheme, dark: docsShikiTheme },
    },
  },
};
