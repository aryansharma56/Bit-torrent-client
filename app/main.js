const process = require("process");
const util = require("util");

// Examples:
// - decodeBencode("5:hello") -> "hello"
// - decodeBencode("10:hello12345") -> "hello12345"
function decodeBencodeString(bencodedValue)
{
  if (!isNaN(bencodedValue[0])) {
    
    const firstColonIndex = bencodedValue.indexOf(":");
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    return bencodedValue.substr(firstColonIndex + 1);
  } else {
    throw new Error("Only strings are supported at the moment");
  }
}
function decodeBencodedIntegers(bencodedValue)
{
  if(bencodedValue[0]=='i'&&bencodedValue[bencodedValue.length-1]=='e')
    {
      return Number(bencodedValue.substr(1,bencodedValue.length-2));
    }
  else{
    throw new Error("Invalid encoded value");
  }
}
function decodeBencode(bencodedValue) {
  // Check if the first character is a digit
  if (!isNaN(bencodedValue[0])) {
    
    const firstColonIndex = bencodedValue.indexOf(":");
    if (firstColonIndex === -1) {
      throw new Error("Invalid encoded value");
    }
    return bencodedValue.substr(firstColonIndex + 1);
  } else {
    if(bencodedValue[0]=='i'&&bencodedValue[bencodedValue.length-1]=='e')
      {
        return Number(bencodedValue.substr(1,bencodedValue.length-2));
      }
    else if(bencodedValue[0]==='l'&&bencodedValue[bencodedValue.length-1]==='e')
      {
        let list=[]
        let i=1;
       while(i<bencodedValue.length-1)
          {
            if(!isNaN(bencodedValue[i]))
              {
                const parts=bencodedValue.substr(i).split(':');
                const length=parseInt(parts[0]);
                const index=bencodedValue.indexOf(":");
                list.push(bencodedValue.substr(index+1,length));
                i+=parts[0].length+length+1;
              }
            else if(bencodedValue[i]==='i')
            {
              const index=bencodedValue.indexOf('e',i);
              list.push(Number(bencodedValue.substring(i+1,index)));
              i=index+1;
            }
            else if(bencodedValue[i]==='l')
              {
                const end =bencodedValue.length-1;
                list.push(decodeBencode(bencodedValue.substring(i, end)))
                i=end+1;
              }
          }
          return list;
      }
    throw new Error("Only strings are supported at the moment");
  }
}

function main() {
  const command = process.argv[2];

  // You can use print statements as follows for debugging, they'll be visible when running tests.
  // console.log("Logs from your program will appear here!");

  // Uncomment this block to pass the first stage
  if (command === "decode") {
    const bencodedValue = process.argv[3];
  
    // In JavaScript, there's no need to manually convert bytes to string for printing
    // because JS doesn't distinguish between bytes and strings in the same way Python does.
    console.log(JSON.stringify(decodeBencode(bencodedValue)));
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

main();
