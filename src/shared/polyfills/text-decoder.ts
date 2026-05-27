const NativeTextDecoder = globalThis.TextDecoder;

if (typeof NativeTextDecoder === "function" && !supportsUtf16Le()) {
  class Utf16LeTextDecoder {
    readonly encoding: string;
    readonly fatal: boolean;
    readonly ignoreBOM: boolean;

    private readonly decoder: TextDecoder | null;

    constructor(label = "utf-8", options: TextDecoderOptions = {}) {
      const normalizedLabel = normalizeEncodingLabel(label);

      this.encoding = normalizedLabel;
      this.fatal = Boolean(options.fatal);
      this.ignoreBOM = Boolean(options.ignoreBOM);
      this.decoder =
        normalizedLabel === "utf-16le"
          ? null
          : new NativeTextDecoder(label, options);
    }

    decode(input?: BufferSource, options?: TextDecodeOptions): string {
      if (this.decoder) {
        return this.decoder.decode(input, options);
      }

      return decodeUtf16Le(input, this.ignoreBOM);
    }
  }

  globalThis.TextDecoder = Utf16LeTextDecoder as typeof TextDecoder;
}

function supportsUtf16Le(): boolean {
  try {
    new NativeTextDecoder("utf-16le");
    return true;
  } catch {
    return false;
  }
}

function normalizeEncodingLabel(label: string): string {
  const normalizedLabel = label.trim().toLowerCase();
  if (normalizedLabel === "utf-16" || normalizedLabel === "utf16le") {
    return "utf-16le";
  }
  return normalizedLabel;
}

function decodeUtf16Le(input: BufferSource | undefined, ignoreBOM: boolean) {
  const bytes = toUint8Array(input);
  const startsWithBom = bytes[0] === 0xff && bytes[1] === 0xfe;
  let decoded = "";

  for (
    let index = !ignoreBOM && startsWithBom ? 2 : 0;
    index + 1 < bytes.length;
    index += 2
  ) {
    decoded += String.fromCharCode(bytes[index] | (bytes[index + 1] << 8));
  }

  return decoded;
}

function toUint8Array(input: BufferSource | undefined): Uint8Array {
  if (!input) return new Uint8Array();
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
}

export {};
