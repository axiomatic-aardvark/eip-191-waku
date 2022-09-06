const { Waku, WakuMessage } = require("js-waku");
const protobuf = require("protobufjs");
const { ethers } = require("ethers");
require("dotenv").config();

const MESSAGE_TOPIC = "/relay-sample/0.1/chat/proto";

function buildMsgParams(encryptionPublicKeyHex, ownerAddressHex) {
  return JSON.stringify({
    domain: {
      name: "My Cool Ethereum Private Message App",
      version: "1",
    },
    message: {
      message:
        "By signing this message you certify that messages addressed to `ownerAddress` must be encrypted with `encryptionPublicKey`",
      encryptionPublicKey: encryptionPublicKeyHex,
      ownerAddress: ownerAddressHex,
    },
    primaryType: "PublishEncryptionPublicKey",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
      ],
      PublishEncryptionPublicKey: [
        { name: "message", type: "string" },
        { name: "encryptionPublicKey", type: "string" },
        { name: "ownerAddress", type: "string" },
      ],
    },
  });
}

async function signEncryptionKey(
  encryptionPublicKeyHex,
  ownerAddressHex,
  provider
) {
  const msgParams = buildMsgParams(encryptionPublicKeyHex, ownerAddressHex);

  let res = await provider.send("eth_signTypedData_v4", [
    ownerAddressHex,
    msgParams,
  ]);

  return res;
}

const run = async () => {
  const waku = await Waku.create({ bootstrap: { default: true } });
  await waku.waitForRemotePeer();

  console.log("Connected to remote peer.");

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_RPC_NODE
  );

  const signature = await signEncryptionKey(
    process.env.PUBLIC_KEY,
    process.env.ADDRESS,
    provider
  );

  console.log(signature);

  protobuf.load("./proto/Message.proto", async (err, root) => {
    if (err) {
      throw err;
    }

    const Message = root.lookupType("gossip.Message");
    const message = {
      text: "Here is the text I want to send",
    };

    const encodedMessage = Message.encode(message).finish();
    const wakuMessage = await WakuMessage.fromBytes(
      encodedMessage,
      MESSAGE_TOPIC
    );

    await waku.relay.send(wakuMessage);
    console.log("Sent.");
  });
};

run().then(() => {
  console.log("Running...");
});
