import fs from 'fs/promises';
import path from 'path';
import { Marked } from 'marked';
import { cookies, headers } from 'next/headers';
import { parseAcceptLanguage } from '@/lib/locale';
import { PREFERENCES } from '@/lib/preferences';
import DOMPurify from 'isomorphic-dompurify';
import DocsClient from './docs-client';

export const revalidate = 0; // Always serve the latest user manual content

const markedInstance = new Marked({
  renderer: {
    heading(this: any, args: any) {
      const htmlText = this.parser.parseInline(args.tokens);
      const cleanText = args.text.replace(/[*_`]/g, '');
      const id = cleanText
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .replace(/\s/g, '-');
      return `<h${args.depth} id="${id}">${htmlText}</h${args.depth}>`;
    }
  }
});

export default async function DocsPage() {
  try {
    const cookieLocale = cookies().get(PREFERENCES.locale.key)?.value;
    const headerLocale = parseAcceptLanguage(headers().get('Accept-Language'));
    const locale = cookieLocale || headerLocale;
    const lang = locale.startsWith('zh') ? 'zh' : 'en';

    const filePath = path.join(process.cwd(), 'docs', `user_manual.${lang}.md`);
    let markdown: string;
    try {
      markdown = await fs.readFile(filePath, 'utf-8');
    } catch (readError) {
      if (lang !== 'en') {
        const fallbackPath = path.join(process.cwd(), 'docs', 'user_manual.en.md');
        markdown = await fs.readFile(fallbackPath, 'utf-8');
      } else {
        throw readError;
      }
    }

    const htmlContent = await markedInstance.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(htmlContent);
    return <DocsClient htmlContent={sanitizedHtml} />;
  } catch (error) {
    console.error('Failed to load user manual:', error);
    const fallbackHtml = `
      <div class="alert alert-error my-4 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Documentation is currently unavailable. Please verify that docs/user_manual.en.md exists and is readable.</span>
      </div>
    `;
    const sanitizedFallback = DOMPurify.sanitize(fallbackHtml);
    return <DocsClient htmlContent={sanitizedFallback} />;
  }
}
