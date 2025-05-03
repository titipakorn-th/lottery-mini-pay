/**
 * Prefixes a path with the configured base path for the application.
 * This ensures that assets are loaded from the correct path when deploying to a subfolder.
 * 
 * @param path The path to prefix with the base path
 * @returns The prefixed path
 */
export function withBasePath(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  
  // Ensure path starts with a slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Combine base path with normalized path
  return `${basePath}${normalizedPath}`;
} 