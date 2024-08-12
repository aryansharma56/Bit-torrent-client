const net = require("net");

const EventEmitter = require("events");

const { PeerState } = require("./PeerState");

module.exports = class Peer extends EventEmitter {
  #state;

  #clientPeerId;

  #socket;

  #ip;

  #port;

  #handshakeMessage;

  constructor(ip, port, clientPeerId) {
    super();

    this.#ip = ip;

    this.#port = port;

    this.#clientPeerId = clientPeerId;

    this.#state = PeerState.INITIAL;
  }

  initiateHandshake(infoHash) {
    console.log("Setting up handshake with infoHash: ", infoHash);

    this.#handshakeMessage = this.#createHandshakeMessageWith(infoHash);

    this.#state = PeerState.HANDSHAKE;

    this.#connectToPeer();

    return this.#socket;
  }

  sendHandshakeMessage() {
    if (this.#state !== PeerState.HANDSHAKE) {
      throw new Error("Not in handshake state");
    }

    this.sendMessage(this.#handshakeMessage);
  }

  sendMessage(message) {
    this.#socket.write(message);
  }

  handleData(data, pieceIndex, pieceLength) {
    let messageLength = data.readUInt32BE(0);

    let messageId = data.readUInt8(4);

    let payload = data.subarray(5, messageLength + 5);

    switch (this.#state) {
      case PeerState.INITIAL:
        console.log("Not supposed to receive data in initial state");

        break;

      case PeerState.HANDSHAKE:
        console.log("Received handshake message");

        this.#state = PeerState.BITFIELD;

        if (data.length > 68) {
          console.log("Handshake and bitfield message are received together");

          this.handleData(data.subarray(68), pieceIndex, pieceLength);
        }

        break;

      case PeerState.BITFIELD:
        if (messageId === 5) {
          console.log("Received bitfield message");

          this.#state = PeerState.INTERESTED;

          this.#sendInterestedMessage();
        }

        break;

      case PeerState.INTERESTED:
        if (messageId === 1) {
          console.log("Received unchoked message");

          this.#state = PeerState.UNCHOKE;

          this.#sendRequestMessage(payload, pieceIndex, pieceLength);
        }

        break;

      case PeerState.PIECE:
        if (messageId === 7) {
          console.log("Received block message");

          this.#sendRequestMessage(payload, pieceIndex, pieceLength);
        }

        break;

      case PeerState.REQUEST_COMPLETE:
        console.log("Received last block message");

        this.#emitBlockEvent(payload);

        console.log("Payload:", payload);

        console.log("Payload length:", payload.length);

        this.#closeConnection();

        break;

      default:
        console.log("Unknown state");
    }
  }

  #connectToPeer() {
    this.#socket = net.createConnection(parseInt(this.#port), this.#ip, () => {
      console.log("Connected to peer");
    });
  }

  #createHandshakeMessageWith(infoHash) {
    const protocolString = "BitTorrent protocol";

    const lengthBuffer = Buffer.from([protocolString.length]);

    const protocolBuffer = Buffer.from(protocolString);

    const reservedBytes = Buffer.alloc(8);

    const peerId = Buffer.from(this.#clientPeerId, "binary");

    const handshakeMessage = Buffer.concat([
      lengthBuffer,
      protocolBuffer,
      reservedBytes,

      Buffer.from(infoHash, "hex"),
      peerId,
    ]);

    return handshakeMessage;
  }

  #sendInterestedMessage() {
    const message = new Uint8Array([0, 0, 0, 1, 2]);

    this.sendMessage(message);
  }

  #sendRequestMessage(payload, pieceIndex, pieceLength) {
    console.log("Sending request message");

    let blockSize = 1 << 14;

    let byteOffset;

    if (this.#state === PeerState.UNCHOKE) {
      byteOffset = 0;

      this.#state = PeerState.PIECE;
    } else {
      byteOffset = payload.readUInt32BE(4) + payload.subarray(8).length;

      this.#emitBlockEvent(payload);
    }

    if (byteOffset + blockSize >= pieceLength) {
      this.#state = PeerState.REQUEST_COMPLETE;

      blockSize = pieceLength - byteOffset;
    }

    const payloadToSent = new Uint32Array([pieceIndex, byteOffset, blockSize]);

    const header = new Uint8Array([0, 0, 0, 13, 6]);

    const requestMessage = Buffer.concat([
      Buffer.from(header.buffer),

      Buffer.from(payloadToSent.buffer).swap32(),
    ]);

    console.log("Request Message:", requestMessage);

    this.sendMessage(requestMessage);
  }

  #emitBlockEvent(payload) {
    this.emit(
      "block",
      payload.readUInt32BE(0),
      payload.readUInt32BE(4),
      payload.subarray(8)
    );
  }

  #closeConnection() {
    this.#state = PeerState.CLOSED;

    this.#socket.end();
  }
};
