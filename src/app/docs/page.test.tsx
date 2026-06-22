import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import DocsPage from './page';

// Mock next/headers
const mockGetCookie = vi.fn();
const mockGetHeader = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: mockGetCookie,
  }),
  headers: () => ({
    get: mockGetHeader,
  }),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

describe('DocsPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCookie.mockReturnValue(undefined);
    mockGetHeader.mockReturnValue('en-US,en;q=0.9');
  });

  it('reads the English markdown file by default, parses it, and renders DocsClient', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('# Mock User Manual\nSome content here.');

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringMatching(/user_manual\.en\.md$/), 'utf-8');
    expect(result.props.htmlContent).toContain('<h1 id="mock-user-manual">Mock User Manual</h1>');
    expect(result.props.htmlContent).toContain('Some content here.');
  });

  it('reads the Chinese markdown file when Chinese locale is requested via cookie', async () => {
    mockGetCookie.mockReturnValue({ value: 'zh' });
    vi.mocked(fs.readFile).mockResolvedValue('# 中文手册\n内容在此。');

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringMatching(/user_manual\.zh\.md$/), 'utf-8');
    expect(result.props.htmlContent).toContain('<h1 id="中文手册">中文手册</h1>');
  });

  it('reads the Chinese markdown file when Chinese locale is requested via Accept-Language header', async () => {
    mockGetHeader.mockReturnValue('zh-CN,zh;q=0.9');
    vi.mocked(fs.readFile).mockResolvedValue('# 中文手册\n内容在此。');

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalledWith(expect.stringMatching(/user_manual\.zh\.md$/), 'utf-8');
    expect(result.props.htmlContent).toContain('<h1 id="中文手册">中文手册</h1>');
  });

  it('falls back to the English manual if the Chinese manual is requested but fails to read', async () => {
    mockGetCookie.mockReturnValue({ value: 'zh' });
    vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
      if (typeof filePath === 'string' && filePath.endsWith('user_manual.zh.md')) {
        throw new Error('File not found');
      }
      return '# English Fallback Manual\nSome content.';
    });

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalledTimes(2);
    expect(fs.readFile).toHaveBeenNthCalledWith(1, expect.stringMatching(/user_manual\.zh\.md$/), 'utf-8');
    expect(fs.readFile).toHaveBeenNthCalledWith(2, expect.stringMatching(/user_manual\.en\.md$/), 'utf-8');
    expect(result.props.htmlContent).toContain('<h1 id="english-fallback-manual">English Fallback Manual</h1>');
  });

  it('renders a fallback error message if the English filesystem read throws an error', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalled();
    expect(result.props.htmlContent).toContain('alert-error');
    expect(result.props.htmlContent).toContain('Documentation is currently unavailable.');
    expect(result.props.htmlContent).toContain('user_manual.en.md');
  });

  describe('Custom heading renderer', () => {
    it('correctly generates tags, IDs, and handles inline markdown for different heading levels', async () => {
      const markdown = `
# Heading One
## Heading Two with *italic*
### Heading Three with \`code\`
#### Heading Four with _underline_
##### Heading Five
###### Heading Six
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(markdown);

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).toContain('<h1 id="heading-one">Heading One</h1>');
      expect(html).toContain('<h2 id="heading-two-with-italic">Heading Two with <em>italic</em></h2>');
      expect(html).toContain('<h3 id="heading-three-with-code">Heading Three with <code>code</code></h3>');
      expect(html).toContain('<h4 id="heading-four-with-underline">Heading Four with <em>underline</em></h4>');
      expect(html).toContain('<h5 id="heading-five">Heading Five</h5>');
      expect(html).toContain('<h6 id="heading-six">Heading Six</h6>');
    });

    it('sanitizes and formats IDs properly by converting to lowercase and replacing spaces/special chars', async () => {
      const markdown = `
# Heading: Hello & World!
# Custom - Heading -- Test
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(markdown);

      const result = await DocsPage();
      const html = result.props.htmlContent;

      // Note: ':' and '&' are stripped. Spaces are replaced by '-'.
      // 'Heading: Hello & World!' -> 'heading-hello--world'
      expect(html).toContain('<h1 id="heading-hello--world">Heading: Hello &amp; World!</h1>');
      // 'Custom - Heading -- Test' -> 'custom---heading----test'
      expect(html).toContain('<h1 id="custom---heading----test">Custom - Heading -- Test</h1>');
    });

    it('supports Chinese/Unicode characters in headings and generates correct IDs', async () => {
      const markdown = `
# 1. 入门与安全
## 4. 银行对账单 CSV 导入
### 基础设置 (Setup)
      `.trim();

      vi.mocked(fs.readFile).mockResolvedValue(markdown);

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).toContain('<h1 id="1-入门与安全">1. 入门与安全</h1>');
      expect(html).toContain('<h2 id="4-银行对账单-csv-导入">4. 银行对账单 CSV 导入</h2>');
      expect(html).toContain('<h3 id="基础设置-setup">基础设置 (Setup)</h3>');
    });
  });

  describe('sanitization behavior', () => {
    it('strips <script> tags from markdown output', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        '# Hello\n<script>alert("xss")</script>\n<p>safe content</p>'
      );

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).toContain('<h1 id="hello">Hello</h1>');
      expect(html).toContain('<p>safe content</p>');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('alert');
    });

    it('strips <script> tags from the error fallback HTML', async () => {
      // Force the outer catch by making fs.readFile throw for English too
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).not.toContain('<script>');
    });

    it('preserves class attributes for Tailwind styling', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        '<div class="alert alert-error">Styled content</div>'
      );

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).toContain('class="alert alert-error"');
    });

    it('strips javascript: URIs from href attributes', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        '<a href="javascript:alert(1)">malicious</a>'
      );

      const result = await DocsPage();
      const html = result.props.htmlContent;

      // Either the href is stripped or the element is removed
      expect(html).not.toContain('javascript:');
    });

    it('allows tel: links through the sanitizer', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(
        '<a href="tel:+1234567890">Call us</a>'
      );

      const result = await DocsPage();
      const html = result.props.htmlContent;

      expect(html).toContain('href="tel:+1234567890"');
    });
  });
});
