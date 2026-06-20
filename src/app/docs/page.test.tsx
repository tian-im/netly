import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import DocsPage from './page';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
  },
}));

describe('DocsPage Server Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads the markdown file, parses it, and renders DocsClient with the HTML content', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('# Mock User Manual\nSome content here.');

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalled();
    expect(result.props.htmlContent).toContain('<h1 id="mock-user-manual">Mock User Manual</h1>');
    expect(result.props.htmlContent).toContain('Some content here.');
  });

  it('renders a fallback error message if the filesystem read throws an error', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    const result = await DocsPage();

    expect(fs.readFile).toHaveBeenCalled();
    expect(result.props.htmlContent).toContain('alert-error');
    expect(result.props.htmlContent).toContain('Documentation is currently unavailable.');
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
  });
});
