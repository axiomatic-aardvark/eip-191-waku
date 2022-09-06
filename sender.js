const { Waku, WakuMessage } = require("js-waku");
const protobuf = require("protobufjs");
const { ethers, Wallet } = require("ethers");
const { fromString } = require("uint8arrays/from-string");
require("dotenv").config();

const MESSAGE_TOPIC = "/relay-sample/0.1/chat/proto";

const run = async () => {
  const waku = await Waku.create({ bootstrap: { default: true } });
  await waku.waitForRemotePeer();

  console.log("Connected to remote peer.");

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_RPC_NODE
  );

  const wallet = new Wallet(process.env.PRIVATE_KEY);
  const connectedWallet = wallet.connect(provider);

  protobuf.load("./proto/Message.proto", async (err, root) => {
    if (err) {
      throw err;
    }

    const Message = root.lookupType("gossip.Message");
    const rawMessage = {
      text: "Here is the text I want to send",
    };

    const signature = await connectedWallet.signMessage(
      fromString(JSON.stringify(rawMessage))
    );

    const message = {
      text: rawMessage.text,
      signature,
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
