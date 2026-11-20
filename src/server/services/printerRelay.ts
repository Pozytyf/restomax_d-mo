import net from 'node:net';

export async function sendRawBytesOverTcp(
  host: string,
  port: number,
  bytes: Uint8Array,
  timeoutMs = 4000,
): Promise<{ ok: boolean; bytesSent: number; error?: string }> {
  const cleanHost = host.trim();
  const cleanPort = Number(port || 9100);
  if (!cleanHost) {
    return {
      ok: false,
      bytesSent: 0,
      error: 'Adresse IP ou hôte de l’imprimante thermique requis.',
    };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: { ok: boolean; bytesSent: number; error?: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);

    socket.connect(cleanPort, cleanHost, () => {
      socket.write(Buffer.from(bytes), (err) => {
        if (err) {
          finish({ ok: false, bytesSent: 0, error: err.message });
        } else {
          socket.end(() => {
            finish({ ok: true, bytesSent: bytes.length });
          });
        }
      });
    });

    socket.on('timeout', () => {
      finish({
        ok: false,
        bytesSent: 0,
        error: `Délai dépassé vers l’imprimante ${cleanHost}:${cleanPort}`,
      });
    });

    socket.on('error', (err) => {
      finish({ ok: false, bytesSent: 0, error: err.message });
    });
  });
}
