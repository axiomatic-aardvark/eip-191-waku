const { Waku } = require("js-waku");
const protobuf = require("protobufjs");

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
        });
      } catch (error) {
        console.error(
          `Protobuf reader could not decode message, assume corrupted`
        );
        return;
      }

      const { text } = message;
      console.log("Decoded from protobuf " + text);
    });
  };

  waku.relay.addObserver(processIncomingMessage, [MESSAGE_TOPIC]);
};

run().then(() => {
  console.log("Running...");
});
