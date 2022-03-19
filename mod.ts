import randomBytes from "https://deno.land/std@0.87.0/node/_crypto/randomBytes.ts";
import { Buffer } from "https://deno.land/std@0.87.0/node/buffer.ts";

export default async function query(ip: string, port: number, timeout = 2500) {
  const t = setTimeout(() => {
    return;
  }, timeout);

  const s = Deno.listenDatagram({
    hostname: "0.0.0.0",
    port: 0,
    transport: "udp",
  });

  const sessionID: number = randomBytes(4).readInt32BE() & 0x0f0f0f0f;

  {
    const requestStream = Buffer.alloc(7);
    requestStream.writeUInt16BE(0xFEFD, 0);
    requestStream.writeUInt8(9, 2);
    requestStream.writeInt32BE(sessionID, 3);

    await s.send(requestStream, {
      hostname: ip,
      port,
      transport: "udp",
    });
  }
  {
    const u = new Buffer(4096);
    await s.receive(u);
    const token = parseInt(u.toString("utf-8", 5));
    const requestStream = Buffer.alloc(15);
    requestStream.writeUInt16BE(0xFEFD, 0);
    requestStream.writeUInt8(0, 2);
    requestStream.writeInt32BE(sessionID, 3);
    requestStream.writeInt32BE(token, 7);
    requestStream.writeInt32BE(0x00, 11);

    await s.send(requestStream, {
      hostname: ip,
      port,
      transport: "udp",
    });
  }
  {
    const u = new Buffer(4096);
    await s.receive(u);
    var resp = u.toString("utf-8", 11).split("\x00\x01player_\x00\x00"); // splicing the output as suggested
    var arr = resp[0].split("\0");
    var players = resp[1].split("\0").filter((item) => {
      return item != "";
    });

    clearTimeout(t);
    return {
      motd: arr[3],
      version: arr[9],
      software: arr[11],
      plugins: arr[13],
      mapName: arr[15],
      currentplayers: parseInt(arr[17]),
      maxPlayers: parseInt(arr[19]),
      whitelist: arr[21] === "off" ? false : true,
      players,
    };
  }
}
