/* eslint-env jest */
jest.mock('@aws-sdk/client-s3')
const {AssertionError} = require('assert')
const {Readable} = require('stream')
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const {createHash} = require('crypto')
const {queue, register} = require('.')

const getRandomString = () => Math.random().toString(36).substring(4)

describe('register()', () => {
  const getThisMock = (configMock) => {
    return {
      config: {get: (key) => configMock[key]},
      register_hook: jest.fn(),
    }
  }

  it('throws if queue-s3.bucket-name is not set', () => {
    const thisMock = getThisMock({})
    expect(() => register.call(thisMock)).toThrow(AssertionError)
    expect(() => register.call(thisMock)).toThrow(/queue-s3.bucket-name/)
    expect(thisMock.register_hook).not.toHaveBeenCalled()
  })

  it('sets queue-s3.bucket-name to plugin object', () => {
    const bucketName = getRandomString()
    const thisMock = getThisMock({'queue-s3.bucket-name': bucketName})
    register.call(thisMock)
    expect(thisMock.bucketName).toBe(bucketName)
    expect(thisMock.register_hook).toHaveBeenCalled()
  })

  it('initializes the aws s3 client', () => {
    const thisMock = getThisMock({'queue-s3.bucket-name': getRandomString()})
    const client = {}
    S3Client.mockReturnValue(client)
    register.call(thisMock)
    expect(S3Client).toHaveBeenCalledTimes(1)
    expect(S3Client).toHaveBeenCalledWith()
    expect(thisMock.client).toBe(client)
  })

  it('registers queue hook correctly', () => {
    const thisMock = getThisMock({'queue-s3.bucket-name': getRandomString()})
    register.call(thisMock)
    expect(thisMock.register_hook).toHaveBeenCalledTimes(1)
    expect(thisMock.register_hook).toHaveBeenCalledWith('queue', 'queue')
  })
})

describe('queue()', () => {
  const next = jest.fn()
  const connection = {
    logdebug: jest.fn(),
    loginfo: jest.fn(),
    logerror: jest.fn(),
    transaction: {
      results: {
        add: jest.fn(),
      },
    },
  }
  let thisMock
  let data
  let md5

  beforeEach(() => {
    thisMock = {
      client: new S3Client(),
      bucketName: getRandomString(),
    }
    data = Buffer.from(getRandomString(), 'utf8')
    md5 = createHash('md5').update(data).digest('base64')
    connection.transaction.rcpt_to = []
    connection.transaction.uuid = getRandomString()
    connection.transaction.message_stream = Readable.from(data)
    global.OK = {}
  })

  it('returns without doing anything if the connection has no transaction', async () => {
    const {transaction, ...connectionNoTxn} = connection
    await queue.call(thisMock, next, connectionNoTxn)
    expect(next).not.toHaveBeenCalled()
    expect(connection.logdebug).not.toHaveBeenCalled()
    expect(thisMock.client.send).not.toHaveBeenCalled()
  })

  describe('when processing a one-recipient message', () => {
    let address
    beforeEach(() => {
      address = getRandomString()
      connection.transaction.rcpt_to = [{address: () => address}]
    })

    it('makes the correct PUT request to S3', async () => {
      const cmd = {}
      PutObjectCommand.mockReturnValue(cmd)
      await queue.call(thisMock, next, connection)
      expect(PutObjectCommand).toHaveBeenCalledTimes(1)
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: thisMock.bucketName,
        Key: connection.transaction.uuid,
        Body: data,
        ContentMD5: md5,
        Metadata: {rcpts: address, 'content-md5': md5},
      })
      expect(thisMock.client.send).toHaveBeenCalledTimes(1)
      expect(thisMock.client.send.mock.calls[0]).toHaveLength(1)
      expect(thisMock.client.send.mock.calls[0][0]).toBe(cmd)
    })

    it('records the success in the results & logs it', async () => {
      await queue.call(thisMock, next, connection)
      expect(connection.transaction.results.add).toHaveBeenCalledTimes(1)
      expect(connection.transaction.results.add).toHaveBeenCalledWith(thisMock, {
        pass: 'message-queued',
      })
      expect(connection.loginfo).toHaveBeenCalledTimes(1)
      expect(connection.loginfo).toHaveBeenCalledWith(thisMock, 'Putting message to S3')
    })

    it('passes on control with an OK', async () => {
      await queue.call(thisMock, next, connection)
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith(global.OK)
    })
  })

  it('PUTs the correct Metadata in S3 when processing a multiple-recipient message', async () => {
    // configure
    const addresses = [getRandomString(), getRandomString(), getRandomString()]
    connection.transaction.rcpt_to = addresses.map((x) => {
      return {address: () => x}
    })
    // execute
    await queue.call(thisMock, next, connection)
    // verify
    expect(PutObjectCommand).toHaveBeenCalledTimes(1)
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: thisMock.bucketName,
      Key: connection.transaction.uuid,
      Body: data,
      ContentMD5: md5,
      Metadata: {rcpts: addresses.join(','), 'content-md5': md5},
    })
  })

  describe('when S3 returns an error', () => {
    let err
    beforeEach(() => {
      err = new Error(getRandomString())
      thisMock.client.send.mockRejectedValue(err)
    })

    it('records the error in the results & logs it', async () => {
      await queue.call(thisMock, next, connection)
      expect(connection.transaction.results.add).toHaveBeenCalledTimes(1)
      expect(connection.transaction.results.add).toHaveBeenCalledWith(thisMock, {err})
      expect(connection.logerror).toHaveBeenCalledTimes(1)
      expect(connection.logerror).toHaveBeenCalledWith(
        thisMock,
        `Error putting message to s3: '${err}'`,
      )
    })

    it('passes on control without an OK', async () => {
      await queue.call(thisMock, next, connection)
      expect(next).toHaveBeenCalledTimes(1)
      expect(next).toHaveBeenCalledWith()
    })
  })
})
