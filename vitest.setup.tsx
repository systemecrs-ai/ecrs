/**
 * vitest.setup.ts
 *
 * Global test setup for Vitest.
 * - Extends expect() with jest-dom matchers (toBeInTheDocument, toHaveClass, etc.)
 * - Stubs next/image so it renders a plain <img> tag (avoids Next.js internals in unit tests)
 */

import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ─── Stub: next/image ────────────────────────────────────────────────────────
// Next.js <Image> requires a server-side optimization pipeline that doesn't
// exist in jsdom. We replace it with a plain <img> that forwards all props.
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill, priority, quality, loader, placeholder, blurDataURL, ...rest } = props;
    return <img {...rest} />;
  },
}));
