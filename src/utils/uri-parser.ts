/**
 * Parse a workflow identifier, which can be either:
 * - A bare workflow ID: "abc123"
 * - A resource URI: "xcode-cloud://workflow/abc123"
 *
 * @param input - The workflow identifier or URI
 * @returns The workflow ID
 */
export function parseWorkflowId(input: string): string {
  if (input.startsWith('xcode-cloud://workflow/')) {
    return input.replace('xcode-cloud://workflow/', '');
  }
  return input;
}

/**
 * Parse a product identifier, which can be either:
 * - A bare product ID: "abc123"
 * - A resource URI: "xcode-cloud://product/abc123"
 *
 * @param input - The product identifier or URI
 * @returns The product ID
 */
export function parseProductId(input: string): string {
  if (input.startsWith('xcode-cloud://product/')) {
    return input.replace('xcode-cloud://product/', '');
  }
  return input;
}

/**
 * Parse a build run identifier, which can be either:
 * - A bare build run ID: "abc123"
 * - A resource URI: "xcode-cloud://build-run/abc123"
 *
 * @param input - The build run identifier or URI
 * @returns The build run ID
 */
export function parseBuildRunId(input: string): string {
  if (input.startsWith('xcode-cloud://build-run/')) {
    return input.replace('xcode-cloud://build-run/', '');
  }
  return input;
}
