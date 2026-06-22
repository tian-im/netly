import fs from 'fs/promises';
import path from 'path';
import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { cookies, headers } from 'next/headers';
import { parseAcceptLanguage } from '@/lib/locale';
import { PREFERENCES } from '@/lib/preferences';
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

// WHY: Shared sanitize config ensures ALL HTML going through dangerouslySetInnerHTML
// is sanitized — both markdown output and the error fallback.
// Note: h1-h6, table elements, pre, code, blockquote, hr, br are all already in
// sanitizeHtml.defaults.allowedTags — we only concat the tags Marked produces that
// are NOT in the defaults: img, sup, sub.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img', 'sup', 'sub',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    code: ['class'],
    pre: ['class'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['align'],
    td: ['align'],
    // WHY: class is essential for Tailwind CSS styling in doc content.
    // It is safe because it can only reference CSS class names, not execute code.
    '*': ['id', 'class'],
  },
  // WHY: The user manual references websites, email addresses, and phone numbers.
  // ftp: is intentionally omitted — no documentation content requires it.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowProtocolRelative: false,
};

function sanitizeHtmlContent(raw: string): string {
  return sanitizeHtml(raw, SANITIZE_OPTIONS);
}

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

    // WHY: We use sanitize-html (DOM-less, no jsdom dependency) as defense-in-depth here.
    // Even though the markdown source is app-controlled (docs/ directory, checked into git),
    // sanitizing the rendered output prevents any hypothetical XSS from a compromised
    // markdown file or a future feature that merges user content into docs.
    // sanitize-html is chosen over isomorphic-dompurify because the latter pulls in jsdom
    // which causes CSS bundling issues in Next.js standalone builds.
    const rawHtml = await markedInstance.parse(markdown);
    const htmlContent = sanitizeHtmlContent(rawHtml);
    return <DocsClient htmlContent={htmlContent} />;
  } catch (error) {
    console.error('Failed to load user manual:', error);
    const fallbackHtml = `
      <div class="alert alert-error my-4 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Documentation is currently unavailable. Please verify that docs/user_manual.en.md exists and is readable.</span>
      </div>
    `;
    return <DocsClient htmlContent={sanitizeHtmlContent(fallbackHtml)} />;
  }
}
