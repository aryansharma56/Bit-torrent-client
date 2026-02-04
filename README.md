# BitTorrent Client (Node.js)

A minimal BitTorrent client built from scratch in **Node.js**, implementing core BitTorrent concepts such as **bencoding**, **info hash generation**, **tracker communication**, **peer discovery**, **handshake**, and **piece-based downloading** — without using any torrent libraries.

This project focuses on understanding the BitTorrent protocol at a low level.

---

## Features

* 📦 **Bencode decoder & encoder**
* 🔑 **Info hash generation (SHA-1)**
* 📡 **Tracker communication** (compact peer list)
* 🌍 **Peer discovery (IP:Port parsing)**
* 🤝 **Peer handshake implementation**
* 🧩 **Piece-wise file downloading**
* ⬇️ Download single pieces or full files
* 🧠 Clean separation of parsing, networking, and peer communication

---

## Requirements

* Node.js **v18+** (for `fetch`)
* Internet connection
* A valid `.torrent` file

---

## Installation

```bash
git clone <repo-url>
cd <repo>
npm install
```

(Uses only core Node modules + axios)

---

## Commands & Usage

All commands are run via:

```bash
node index.js <command> [args]
```

---

### 1. Decode Bencode

Decodes a bencoded value and prints JSON.

```bash
node index.js decode "d3:cow3:moo4:spam4:eggse"
```

---

### 2. Torrent Info

Prints metadata from a `.torrent` file.

```bash
node index.js info sample.torrent
```

**Output includes:**

* Tracker URL
* File length
* Info hash
* Piece length
* All piece hashes

---

### 3. List Peers

Fetches peers from the tracker using compact mode.

```bash
node index.js peers sample.torrent
```

**Output**

```
192.168.1.5:6881
203.0.113.10:51413
...
```

---

### 4. Peer Handshake

Performs a BitTorrent handshake with a peer.

```bash
node index.js handshake sample.torrent 192.168.1.5:6881
```

**Output**

```
Peer ID: <hex-encoded-peer-id>
```

---

### 5. Download a Single Piece

Downloads a specific piece by index.

```bash
node index.js download_piece -o output.dat sample.torrent 3
```

✔ Validates piece hash
✔ Writes piece to disk

---

### 6. Download Entire File

Downloads all pieces and reconstructs the full file.

```bash
node index.js download -o output.dat sample.torrent
```

---

## Project Structure

```
.
├── index.js                     # CLI entry point
├── lib/
│   └── PeerCommunication.js     # Peer messaging & piece download logic
├── utils/
│   ├── bencode.js               # Encoder/decoder logic
│   └── torrent.js               # Torrent parsing helpers
```

---

## Core Concepts Implemented

### Bencoding

* Integers, strings, lists, dictionaries
* Canonical dictionary sorting for hashing

### Info Hash

* SHA-1 hash of **bencoded `info` dictionary**
* Used for tracker and peer communication

### Tracker Protocol

* HTTP GET with URL-encoded binary info hash
* Compact peer list parsing (6 bytes per peer)

### Peer Protocol

* Handshake (`BitTorrent protocol`)
* Peer ID exchange
* Piece request & verification

---

## Design Decisions

* **No torrent libraries** — protocol implemented manually
* **Binary-safe parsing** using `Buffer`
* **Piece verification** using SHA-1 hashes
* Modular peer communication for scalability

---

## Limitations

* Single-file torrents only
* No UDP tracker support
* No choking/unchoking strategy
* No resume support
* No DHT / magnet links

*(All intentionally omitted to keep the core protocol clear)*

---

## Why This Project?

This project demonstrates:

* Deep understanding of BitTorrent internals
* Binary protocols & networking
* Cryptographic hashing
* Systems-level problem solving
---

## Future Improvements

* Parallel piece downloading
* Multi-file torrent support
* DHT & magnet links
* Refactor this into a **clean CLI tool**
* Or tighten this README for **resume/GitHub highlights** 🚀
