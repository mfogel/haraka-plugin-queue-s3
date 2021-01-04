const getStream = require('get-stream')
const {createHash} = require('crypto')
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const {strict: assert} = require('assert')

exports.register = function () {
  this.client = new S3Client()
  this.bucketName = this.config.get('queue-s3.bucket-name')
  assert(this.bucketName, 'queue-s3.bucket-name must be configured')
  this.register_hook('queue', 'queue')
}

exports.queue = async function (next, connection, params) {
  // Cache the transaction to avoid issues if the SMTP session gets dropped
  const txn = connection.transaction
  if (!txn) return

  // PutObjectCommand claims to accept a Readable stream for the Body
  // but then fails because it is unable to provide a content-length header
  // Hence we read the value into a buffer before passing it to the SDK.
  connection.logdebug(this, 'Buffering message')
  const body = await getStream.buffer(txn.message_stream)
  const bodyMd5 = createHash('md5').update(body).digest('base64')
  const rcpts = txn.rcpt_to.map((rcpt) => rcpt.address()).join(',')

  const cmd = new PutObjectCommand({
    Bucket: this.bucketName,
    Key: txn.uuid,
    Body: body,
    ContentMD5: bodyMd5,
    Metadata: {rcpts, 'content-md5': bodyMd5},
  })

  connection.loginfo(this, 'Putting message to S3')
  try {
    await this.client.send(cmd)
  } catch (err) {
    connection.logerror(this, `Error putting message to s3: '${err}'`)
    txn.results.add(this, {err})
    return next()
  }
  txn.results.add(this, {pass: 'message-queued'})
  return next(OK)
}
