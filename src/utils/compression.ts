import { gzip, gunzip } from "https://deno.land/x/compress@v0.4.5/mod.ts";

export const compress_content = async (content: string): Promise<string> => {
  const data = new TextEncoder().encode(content);
  const compressed = await gzip(data);
  return btoa(String.fromCharCode(...compressed));
};

export const decompress_content = async (content: string): Promise<string> => {
  const data = Uint8Array.from(atob(content), c => c.charCodeAt(0));
  const decompressed = await gunzip(data);
  return new TextDecoder().decode(decompressed);
}; 