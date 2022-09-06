const { Waku } = require("js-waku");
const protobuf = require("protobufjs");
const { ethers, Wallet } = require("ethers");
const { fromString } = require("uint8arrays/from-string");

const MESSAGE_TOPIC = "/relay-sample/0.1/chat/proto";

const run = async () => {
  const waku = await Waku.create({
    bootstrap: { default: true },
  });
  await waku.waitForRemotePeer();
  console.log("Connected to remote peer.");

  const processIncomingMessage = async (wakuMessage) => {
    console.log("Handling...");

    protobuf.load("./proto/Message.proto", async (err, root) => {
      if (err) {
        throw err;
      }

      let message;
      try {
        const Message = root.lookupType("gossip.Message");
        const decodedMessage = Message.decode(wakuMessage.payload);

        message = Message.toObject(decodedMessage, {
          text: String,
          signature: String,
        });
      } catch (error) {
        console.error(
          `Protobuf reader could not decode message, assume corrupted`
        );
        return;
      }

      const { text, signature } = message;
      console.log("Decoded text " + text);
      console.log("Decoded signature " + signature);

      const address = ethers.utils.verifyMessage(
        fromString(
          JSON.stringify({
            text: "Here is the text I want to send",
          })
        ),
        signature
      );

      console.log("address " + address);
    });
  };

  waku.relay.addObserver(processIncomingMessage, [MESSAGE_TOPIC]);
};

run().then(() => {
  console.log("Running...");
});
