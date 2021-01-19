import type { Handler } from 'aws-lambda'
import { IvsClient, ListChannelsCommand, ListStreamsCommand } from '@aws-sdk/client-ivs'
import { DynamoDB, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'

let response

export const handler: Handler = async () => {
  const tableName = process.env.TABLE_NAME
  if (!tableName) {
    throw Error('TABLE_NAME not set')
  }

  const counts: { [key: string]: number } = {}
  const time = Date.now()

  const ivs = new IvsClient({})
  try {
    const listChannels = new ListChannelsCommand({})
    const resListChannels = await ivs.send(listChannels)
    if (resListChannels.channels) {
      resListChannels.channels.forEach((channel) => {
        if (channel.arn) {
          counts[channel.arn] = 0
        }
      })
    }

    const listStreams = new ListStreamsCommand({})
    const resListStreams = await ivs.send(listStreams)
    if (resListStreams.streams) {
      resListStreams.streams.forEach((stream) => {
        if (stream.channelArn && stream.viewerCount) {
          counts[stream.channelArn] += stream.viewerCount
        }
      })
    }

    const dynamodb = new DynamoDB({})

    const requestItems = Object.entries(counts).map((item) => ({
      PutRequest: {
        Item: {
          channel: { S: item[0] },
          time: { N: String(time) },
          count: { N: String(item[1]) },
        },
      },
    }))

    for (let i = 0; i < requestItems.length; i += 25) {
      const batchWriteItem = new BatchWriteItemCommand({
        RequestItems: {
          [tableName]: requestItems.slice(i, i + 25),
        },
      })
      await dynamodb.send(batchWriteItem)
    }

    response = {
      statusCode: 200,
      body: JSON.stringify(counts),
    }
  } catch (err) {
    console.log(err)
    return err
  }

  return response
}
