import fs from 'fs/promises';
import path from 'path';
import { Marked } from 'marked';
import DocsClient from './docs-client';

export const revalidate = 0; // Always serve the latest user manual content

const markedInstance = new Marked({
  renderer: {
    heading(this: any, args: any) {
      const htmlText = this.parser.parseInline(args.tokens);
      const cleanText = args.text.replace(/[*_`]/g, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s/g, '-');
      return `<h${args.depth} id="${id}">${htmlText}</h${args.depth}>`;
    }
  }
});

export default async function DocsPage() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'user_manual.md');
    const markdown = await fs.readFile(filePath, 'utf-8');
    const htmlContent = await markedInstance.parse(markdown);
    return <DocsClient htmlContent={htmlContent} />;
  } catch (error) {
    console.error('Failed to load user manual:', error);
    const fallbackHtml = `
      <div class="alert alert-error my-4 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Documentation is currently unavailable. Please verify that docs/user_manual.md exists and is readable.</span>
      </div>
    `;
    return <DocsClient htmlContent={fallbackHtml} />;
  }
}
