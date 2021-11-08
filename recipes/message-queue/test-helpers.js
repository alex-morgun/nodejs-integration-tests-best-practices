const {
  FakeMessageQueueProvider,
} = require('../../example-application/libraries/fake-message-queue-provider');
const {
  MessageQueueStarter,
} = require('../../example-application/entry-points/message-queue-starter');
const { once } = require('events');
const { resolve } = require('path');
const amqplib = require('amqplib');
const MessageQueueClient = require('../../example-application/libraries/message-queue-client');

module.exports.createQueueForTest = async ({
  exchangeName,
  queueName,
  bindingPattern,
  deadLetterExchange = undefined,
  deadLetterBindingPattern = undefined,
  ttl = undefined,
} = {}) => {
  const mqClient = new MessageQueueClient(amqplib);
  const randomizedQueueName = `${queueName}-${this.getShortUnique()}`;
  const randomizedExchangeName = `${exchangeName}-${this.getShortUnique()}`;
  // TODO - forgot to add the await
  await mqClient.assertExchange(randomizedExchangeName, 'topic');
  await mqClient.assertQueue(randomizedQueueName, {
    deadLetterExchange,
    deadLetterRoutingKey: deadLetterBindingPattern,
    messageTtl: ttl,
  });
  await mqClient.bindQueue(
    randomizedQueueName,
    randomizedExchangeName,
    bindingPattern
  );
  return {
    mqClient,
    queueName: randomizedQueueName,
    exchangeName: randomizedExchangeName,
  };
};

module.exports.createDeadLetterQueueForTest = async (
  exchangeName,
  queueName,
  bindingPattern
) => {
  const mqClient = new MessageQueueClient(amqplib);

  const randomizedQueueName = `${queueName}-${this.getShortUnique()}`;
  const randomizedExchangeName = `${exchangeName}-${this.getShortUnique()}`;

  // TODO - MAKE THIS TO BE MQ AGNOSTIC
  // In RabbitMQ Dead Letter Exchanges must be fan-out
  await mqClient.assertExchange(randomizedExchangeName, 'fanout');
  await mqClient.assertQueue(randomizedQueueName);
  await mqClient.bindQueue(
    randomizedQueueName,
    randomizedExchangeName,
    bindingPattern
  );

  return {
    mqClient,
    queueName: randomizedQueueName,
    exchangeName: randomizedExchangeName,
  };
};

module.exports.startMQSubscriber = async (
  fakeOrReal,
  queueName,
  deadLetterQueueName = undefined
) => {
  const messageQueueProvider =
    fakeOrReal === 'fake' ? new FakeMessageQueueProvider() : amqplib;
  const messageQueueClient = new MessageQueueClient(messageQueueProvider);
  await new MessageQueueStarter(
    messageQueueClient,
    queueName,
    deadLetterQueueName
  ).start();

  return messageQueueClient;
};

module.exports.addNewOrder = async (axiosAPIClient) => {
  const orderToAdd = {
    userId: 1,
    productId: 2,
    mode: 'approved',
  };
  const addedOrderId = (await axiosAPIClient.post('/order', orderToAdd)).data
    .id;
  return addedOrderId;
};

module.exports.getShortUnique = () => {
  const now = new Date();
  // We add this weak random just to cover the case where two test started at the very same millisecond
  const aBitOfMoreSalt = Math.ceil(Math.random() * 99);
  return `${process.pid}${aBitOfMoreSalt}${now.getMilliseconds()}`;
};
