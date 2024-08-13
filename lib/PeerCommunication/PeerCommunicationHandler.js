const fs = require("fs-extra");

const crypto = require("crypto");

const Peer = require("./Peer");

module.exports = class PeerCommunicationHandler {
  #peerConfigs;

  #clientPeerId;

  #chunks;

  #pieceLength;

  #length;

  #infoHash;

  #pieces;
  constructor(
    peerConfigs,
    clientPeerId,
    pieceLength,
    length,
    infoHash,
    pieces
  ) {
    this.#peerConfigs = peerConfigs;
    this.#clientPeerId = clientPeerId;
    this.#pieceLength = pieceLength;
    this.#length = length;
    this.#infoHash = infoHash;
    this.#pieces = pieces;
    this.#chunks = [];
  }

  async downloadPieceTo(filePath, pieceIndex, peerIndex = 0) {
    return new Promise((resolve, reject) => {
      console.log("Downloading piece:", pieceIndex);

      const length = this.#length;

      let pieceLength = this.#pieceLength;

      console.log("Each Piece length:", pieceLength);

      if (pieceIndex === Math.ceil(length / pieceLength) - 1) {
        pieceLength = length % pieceLength;
      }

      console.log("length of whole file:", length);

      console.log(`Piece ${pieceIndex} length: ${pieceLength}`);

      const [ip, port] = this.#peerConfigs[peerIndex].split(":");

      let peer = new Peer(ip, port, this.#clientPeerId);

      let socket = peer.initiateHandshake(this.#infoHash);

      socket.on("data", (data) => {
        peer.handleData(data, pieceIndex, pieceLength);
      });

      socket.on("end", () => {
        console.log("Connection closed");

        if (this.#chunks.length > 0) {
          let piece = Buffer.concat(this.#chunks);

          this.#checkIntegrity(piece, pieceIndex);

          this.#writePieceToFileSync(filePath, piece);
        }

        resolve();

        return;
      });

      socket.on("error", (err) => {
        console.error(err);

        reject(err);
      });

      peer.on("block", (pieceIndex, byteOffset, block) => {
        console.log("Received block");

        this.#chunks.push(block);
      });

      peer.sendHandshakeMessage();
    });
  }

  #writePieceToFileSync(filePath, piece) {
    fs.ensureFileSync(filePath);
    fs.appendFileSync(filePath, piece);
  }

  #checkIntegrity(piece, pieceIndex) {
    const hash = crypto.createHash("sha1").update(piece).digest("hex");

    // let pieceHashes = Buffer.from(this.#clientTorrentInfo.pieces, "binary");

    const expectedHash = this.#pieces[pieceIndex];

    if (hash === expectedHash) {
      console.log("Piece is valid");
    } else {
      console.error("Piece is not valid");
    }
  }

  async downloadPieces(filePath) {
    // let finalBuffer = Buffer.alloc(0);
    for (let i = 0; i < this.#pieces.length; i++) {
      await this.downloadPieceTo(filePath, i);
      console.log("downloaded piece ", i);
      this.#chunks = Buffer.alloc(0);
      // finalBuffer = Buffer.concat([finalBuffer, fs.readFileSync(filePath)]);
    }
    // fs.writeFileSync(filePath, Buffer.concat(this.#chunks));
  }
};
