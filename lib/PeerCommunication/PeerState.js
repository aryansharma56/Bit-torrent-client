const PeerState = Object.freeze({
  INITIAL: "INITIAL",

  HANDSHAKE: "HANDSHAKE",

  BITFIELD: "BITFIELD",

  INTERESTED: "INTERESTED",

  UNCHOKE: "UNCHOKE",

  REQUEST_COMPLETE: "REQUEST_COMPLETE",

  PIECE: "PIECE",

  CLOSED: "CLOSED",
});

module.exports = {
  PeerState,
};
