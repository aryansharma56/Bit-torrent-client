const fs = require("fs-extra");
const net = require("net");
const crypto = require("crypto");

// import fs from "fs";

// import net from "net";

// import crypto from "crypto";

const PROTOCOL_LENGTH = 19;

const PROTOCOL_STRING = "BitTorrent protocol";
const DEFAULT_BLOCK_SIZE = 2 ** 14;

const STORAGE_PATH = "storage/";

class Peer {
  constructor({
    ip,
    port,
    piece_length,
    piece_index,
    piece_hashes,
    info_hash,
    peer_id,
    output_path = STORAGE_PATH,
  }) {
    this.ip = ip;

    this.port = port;

    this.info_hash = info_hash;

    this.peer_id = peer_id;

    this.piece_length = piece_length;

    this.piece_index = piece_index;

    this.piece_hashes = piece_hashes;

    this.output_path = output_path;

    this.socket = null;

    this.buffer = Buffer.alloc(0);

    this.downloaded = 0;
    this.state = "handshake";
    this.offset = 0;
    this.chunks = [];
  }

  async isConnected() {
    return this.socket && !this.socket.closed;
  }

  // when the handshake is send this function is resolved.

  async connect() {
    return new Promise(async (resolve) => {
      console.log(JSON.stringify(this));

      const socket = net.connect(this.port, this.ip, () => {
        console.log(`${this.ip}:${this.port} is connected`);
      });

      socket.on("data", this.handleData.bind(this));

      socket.on("error", this.handleError.bind(this));

      socket.on("close", () => {
        const fileValS = Buffer.concat(this.chunks);
        fs.ensureFileSync(this.output_path);
        fs.writeFileSync(this.output_path, fileValS, { flag: "w" });
        console.log("connection closed");
      });

      socket.on("connect", () => {
        // construct the handshake message

        const handshake_message = this.constructHandshakeMessage();

        // write the handshake message

        socket.write(handshake_message);

        this.socket = socket;

        resolve();
      });
    });
  }

  constructHandshakeMessage() {
    const handshake = Buffer.alloc(68);

    handshake.writeUInt8(PROTOCOL_LENGTH, 0);

    handshake.write(PROTOCOL_STRING, 1);

    handshake.fill(0, 20, 28); // Zero-fill reserved bytes

    this.info_hash.copy(handshake, 28);

    Buffer.from(this.peer_id).copy(handshake, 48);

    return handshake;
  }

  async doHandshake() {
    const handshake = Buffer.alloc(68);

    handshake.writeUInt8(PROTOCOL_LENGTH, 0);

    handshake.write(PROTOCOL_STRING, 1);

    handshake.fill(0, 20, 28); // Zero-fill reserved bytes

    this.info_hash.copy(handshake, 28);

    Buffer.from(this.peer_id).copy(handshake, 48);

    this.socket.write(handshake);

    const response = await this.waitForData();

    this.validateHandshake(response);

    this.buffer = Buffer.alloc(0);

    if (response.length > 68) {
      this.socket.emit("data", response.slice(68));
    }
  }

  validateHandshake(response) {
    const protocolLength = response.readUInt8(0);

    const infohashResponse = response.slice(
      protocolLength + 9,
      protocolLength + 29
    );

    const peerIdResponse = response.slice(
      protocolLength + 29,
      protocolLength + 49
    );

    if (infohashResponse.toString("hex") !== this.info_hash.toString("hex")) {
      throw new Error("Infohash mismatch");
    }

    console.log(`Peer ID: ${peerIdResponse.toString("hex")}`);
  }

  async waitForData() {
    return new Promise((resolve) => {
      const onData = (data) => {
        this.socket.off("data", onData); // Changed from removeListener to off for better readability and modern syntax

        resolve(data);
      };

      this.socket.on("data", onData);
    });
  }

  handleData(data) {
    console.log("length of data is", data.length);
    // fs.appendFileSync(
    //   `${STORAGE_PATH}PACKETS.txt`,
    //   JSON.stringify(data) + "\n******** RECEIVED *********\n"
    // );

    this.buffer = Buffer.concat([this.buffer, data]);

    this.processBuffer(data);
  }

  processBuffer(data) {
    console.log(data);
    const messageLength = data.readUInt32BE(0);
    console.log("message length is", messageLength);
    const id = data.readUInt8(4);
    let payload = data.subarray(5, messageLength + 5);
    console.log("message id is", id);
    if (this.state == "handshake") {
      this.state = "bitfeild";
      if (data.length > 68) {
        this.processBuffer(data.subarray(68));
      }
    } else if (this.state == "bitfeild") {
      console.log("recieved bitfeild message");
      this.state = "interested";
      console.log("sending interested message");
      this.sendMessage(this.constructMessage(2, 1));
    } else if (this.state == "interested") {
      console.log("recieved unchoke message");
      this.state = "piece";
      console.log("sending request message");
      // this.sendRequestMessage(payload, this.piece_index, this.piece_length);
      this.sendMessage(this.constructRequestMessage());
    } else if (this.state == "piece") {
      // this.sendMessage(th);
      this.handlePiece(data, messageLength);
      // this.sendRequestMessage(payload, this.piece_index, this.piece_length);
    }
    //  else if (this.state == "request_complete") {
    //   console.log("Received last block message");

    //   this.chunks.push(payload.subarray(8));
    //   this.computeDownloadedFiles();
    //   this.disconnect();
    // }
  }

  handleRequest(id1) {
    console.log("message id is", id1);
    const id = parseInt(id1);
    switch (id) {
      case 5: // bitfield
        this.sendMessage(this.constructMessage(2, 1));

        break;

      case 1: // unchoke
        this.sendMessage(this.constructRequestMessage());

        break;

      case 7: // piece
        this.handlePiece();

        break;

      default:
        console.log(`Unhandled message ID: ${id}`);
    }
  }

  constructMessage(id, length = 1) {
    const message = Buffer.alloc(length + 4);

    message.writeUInt32BE(length, 0);

    message.writeUInt8(id, 4);

    return message;
  }
  sendRequestMessage(payload, pieceIndex, pieceLength) {
    let blockSize = 1 << 14;

    let byteOffset;

    if (this.state == "unchoke") {
      this.offset = 0;

      this.state = "piece";
    } else {
      this.offset += DEFAULT_BLOCK_SIZE;
      this.chunks.push(payload.subarray(8));
    }
    byteOffset = this.offset;
    if (byteOffset + blockSize >= pieceLength) {
      this.state = "request_complete";

      blockSize = pieceLength - byteOffset;
    }
    console.log("byte offset is", byteOffset);
    console.log("blockSize is ", blockSize);

    const payloadToSent = new Uint32Array([pieceIndex, byteOffset, blockSize]);

    const header = new Uint8Array([0, 0, 0, 13, 6]);

    const requestMessage = Buffer.concat([
      Buffer.from(header.buffer),

      Buffer.from(payloadToSent.buffer).swap32(),
    ]);
    this.sendMessage(requestMessage);
  }
  constructRequestMessage(nextBlockOffset = 0, blockSize = DEFAULT_BLOCK_SIZE) {
    console.log("offset", nextBlockOffset);
    console.log("blocksize", blockSize);
    const message = this.constructMessage(6, 13);

    message.writeUInt32BE(this.piece_index, 5);

    message.writeUInt32BE(nextBlockOffset, 9); // blockLength

    message.writeUInt32BE(blockSize, 13); // block length

    return message;
  }

  handlePiece(data, messageLength) {
    const incoming_piece_index = data.readUInt32BE(5);

    const incoming_block_offset = data.readUInt32BE(9);

    const incoming_data = data.subarray(13);

    fs.appendFileSync(this.output_path, incoming_data);

    console.log(
      `Downloaded block ${incoming_block_offset} of piece ${incoming_piece_index}.`
    );

    this.requestNextBlockOrComplete(incoming_block_offset);
  }

  requestNextBlockOrComplete(blockOffset) {
    const nextBlockOffset = blockOffset;

    const remainingBytesInPiece = this.piece_length - nextBlockOffset;

    if (remainingBytesInPiece > 0) {
      this.sendMessage(
        this.constructRequestMessage(
          nextBlockOffset,
          Math.min(DEFAULT_BLOCK_SIZE, remainingBytesInPiece)
        )
      );
    } else {
      console.log("completed download...", remainingBytesInPiece);
      this.computeDownloadedFiles();
    }
  }

  computeDownloadedFiles() {
    // const fileBuffer = fs.readFileSync(this.output_path);
    const downloadedData = Buffer.concat(this.chunks);
    const hash = crypto.createHash("sha1").update(downloadedData).digest("hex");

    let is_valid;
    console.log(this.chunks.length);
    console.log("FILE HASH -->", this.piece_hashes[this.piece_index]);

    console.log("MY FILE HASH -->", hash);

    if (hash !== this.piece_hashes[this.piece_index]) {
      is_valid = 1;

      console.log("Hash mismatch! Download Broken");
    } else {
      is_valid = 1;

      console.log("Hash Verified! Downloaded Piece successfully");
    }

    this.disconnect(is_valid);
  }

  handleError(error) {
    console.error("Error:", error);
  }

  sendMessage(message) {
    // fs.appendFileSync(
    //   `${STORAGE_PATH}PACKETS.txt`,
    //   JSON.stringify(message) + "\n******** SENT *********\n"
    // );

    this.socket.write(message);
  }

  disconnect(result) {
    this.downloaded = result;
    this.socket.end();
    // this.socket.end();
    // this.socket.emit(
    //   "downloaded",
    //   "downloaded the file closing the connection."
    // );
  }
}
module.exports = { Peer };
// export { Peer };
