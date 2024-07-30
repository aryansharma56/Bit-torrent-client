const process = require("process");
const fs = require('fs');
const path = require('path');
const util = require("util");
const crypto= require('crypto')
const axios=require('axios')
function decodeBencode(bencodedString) {

    let position = 0;

    function parse() {

        if (bencodedString[position] === 'i') {

            const end = bencodedString.indexOf('e', position);

            const number = parseInt(bencodedString.substring(position + 1, end));

            position = end + 1;

            return number;

        } else if (!isNaN(bencodedString[position])) {

            // Byte string: <length>:<string>

            const colon = bencodedString.indexOf(':', position);

            const length = parseInt(bencodedString.substr(position, colon));
            const a = new Uint8Array(Buffer.from(bencodedString, "binary"));
            const outS = Buffer.from(

              a.slice(colon + 1, colon + 1 + length),
        
            ).toString("binary");
            const str = bencodedString.substring(colon + 1, colon + length + 1);

            position = colon + length + 1;

            return str;

        } else if (bencodedString[position] === 'l') {

            // List: l<elements>e

            position++;

            const list = [];

            while (bencodedString[position] !== 'e') {

                list.push(parse());

            }

            position++;

            return list;

        } else if (bencodedString[position] === 'd') {

            // Dictionary: d<key-value pairs>e

            position++;

            const dict = {};

            while (bencodedString[position] !== 'e') {

                const key = parse();

                dict[key] = parse();

            }

            position++;

            return dict;
        }
    }
  return parse();
}
function printTorrentInfo(torrentInfo,bencodedInfoValue) {

  const trackerUrl = torrentInfo.announce;

  const fileLength = torrentInfo.info.length;

  console.log(`Tracker URL: ${trackerUrl}`);

  console.log(`Length: ${fileLength}`);
  console.log(`Info Hash: ${bencodedInfoValue}`);
  console.log(`Piece Length: ${torrentInfo.info["piece length"]}`)
  console.log("Piece Hashes:")
  let buffer = Buffer.from(torrentInfo.info.pieces, 'binary');
  console.log('Piece Hashes:');

  for (let i = 0; i < buffer.length; i += 20) {

    console.log(buffer.subarray(i, i + 20).toString("hex"));

  }
  // console.log(pieces.join(''))
}

  // console.log(pieces);


function findSHA(bencodedValue){
  const sha1Hash = crypto.createHash("sha1");
  sha1Hash.update(bencodedValue);
  return sha1Hash.digest("hex");
}
function bencode(input)
{
  let bencodedString="";
  if(Number.isFinite(input))
  {
    return `i${input}e`;
  }
  else if(typeof input === "string")
  {
    return `${input.length}:${input}`
  }
  else if (Array.isArray(input)) {

    return `l${input.map((i) => bencode(i)).join("")}e`;
  }
  else {

    const d = Object.entries(input)
    .sort(([k1], [k2]) => k1.localeCompare(k2))
    .map(([k, v]) => `${bencode(k)}${bencode(v)}`);

    return `d${d.join("")}e`;
  } 
    
  // return bencodedString;
}
function customEncodeHexString(hexString) {
  const binaryHash = Buffer.from(hexString, 'hex');

    const urlEncodedHash = [...binaryHash]

      .map(byte => {

        const char = String.fromCharCode(byte);

        return /[A-Za-z0-9-._~]/.test(char) ? char : '%' + byte.toString(16).padStart(2, '0').toLowerCase();

      })

      .join('');
    return urlEncodedHash;
  // let result = '';
  // for (let i = 0; i < hexString.length; i += 2) {
  //     let hexByte = hexString.slice(i, i + 2);
  //     result += '%' + hexByte;
  // }
  // return result;
}
const hexToByte = (hex) => {
  const key = '0123456789abcdef'
  let newBytes = []
  let currentChar = 0
  let currentByte = 0
  for (let i=0; i<hex.length; i++) {   // Go over two 4-bit hex chars to convert into one 8-bit byte
    currentChar = key.indexOf(hex[i])
    if (i%2===0) { // First hex char
      currentByte = (currentChar << 4) // Get 4-bits from first hex char
    }
    if (i%2===1) { // Second hex char
      currentByte += (currentChar)     // Concat 4-bits from second hex char
      newBytes.push(currentByte)       // Add byte
    }
  }
  return new Uint8Array(newBytes)
}
function getTorrentHash(torrentFileParsed) {

  const encodedInfo = bencode(torrentFileParsed.info);

  const infoDictHash = crypto.createHash('sha1').update(encodedInfo, 'binary').digest('hex');

  return infoDictHash;

}
function torrentFileParser(file) {

  const content = fs.readFileSync(file);

  return decodeBencode(content.toString('binary'));

}

function extractTorrentInfo(torrentFileParsed) {

  let extractedInformation = {};

  extractedInformation.trackerURL = Buffer.from(torrentFileParsed.announce, 'binary').toString();

  extractedInformation.length = torrentFileParsed.info.length;

  extractedInformation.infoHash = getTorrentHash(torrentFileParsed);

  extractedInformation['piece length'] = torrentFileParsed.info["piece length"];

  extractedInformation.pieces = torrentFileParsed.info.pieces;

  return extractedInformation;

}


async function  main() {
  const command = process.argv[2];

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  // console.log("Logs from your program will appear here!");

  // Uncomment this block to pass the first stage
  if (command === "decode") {
    const bencodedValue = process.argv[3];
  
    // In JavaScript, there's no need to manually convert bytes to string for printing
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  }
  else if(command==="info"){
   const fileName = process.argv[3];
   const filePath = path.resolve(__dirname,"..", fileName);
   const bencodedValue= fs.readFileSync(path.resolve('.', fileName));
  //  console.log(bencodedValue);
   const decodedValue=decodeBencode(bencodedValue.toString("binary"));
  //  console.log(decodedValue.info);
   const bencodedInfoValue=bencode(decodedValue.info)
  //  console.log(bencodedInfoValue);
  const tmpBuff = Buffer.from(bencodedInfoValue, "binary");
   const sha=findSHA(tmpBuff);
   printTorrentInfo(decodedValue,sha);
  
  }
  else if(command==="peers")
  {
    const file = process.argv[3];

    const peerID = "00112233445566778899";

    const torrentFileParsed = torrentFileParser(file);

    const torrentObj = extractTorrentInfo(torrentFileParsed);

    const { trackerURL, length, infoHash } = torrentObj;

    const binaryHash = Buffer.from(infoHash, 'hex');

    const urlEncodedHash = [...binaryHash]

      .map(byte => {

        const char = String.fromCharCode(byte);

        return /[A-Za-z0-9-._~]/.test(char) ? char : '%' + byte.toString(16).padStart(2, '0').toLowerCase();

      })

      .join('');

    const trackerURLWithParams = `${trackerURL}?info_hash=${urlEncodedHash}&` +

      new URLSearchParams({

        peer_id: peerID,

        port: 6881,

        uploaded: 0,

        downloaded: 0,

        left: length,

        compact: 1,

      }).toString();

    const trackerResponse = await fetch(trackerURLWithParams);

    const arrBuffer = await trackerResponse.arrayBuffer();

    const data = Buffer.from(arrBuffer, 'binary');

    const decodedPeersInfo = decodeBencode(data.toString('binary'));

    const peersBuffer = Buffer.from(decodedPeersInfo.peers, 'binary');

    const peerList = [];

    for (let i = 0; i < peersBuffer.length; i += 6) {

      let ip = 

        peersBuffer[i] +

        "." +

        peersBuffer[i + 1] +

        "." +

        peersBuffer[i + 2] +

        "." +

        peersBuffer[i + 3] +

        ":";

      const portNumber = peersBuffer[i + 4] * 256 + peersBuffer[i + 5];

      ip = ip + portNumber;

      peerList.push(ip);

    }

    for (let i = 0; i < peerList.length; i++) {

      console.log(peerList[i]);

    }
      // console.log(res.status);

   }
   

  
  else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
