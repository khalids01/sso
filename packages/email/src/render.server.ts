import type { ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";

async function readableStreamToString(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }

  return html + decoder.decode();
}

export const renderEmailTemplate = async (element: ReactElement) => {
  const stream = await renderToReadableStream(element);
  await stream.allReady;

  return readableStreamToString(stream);
};
