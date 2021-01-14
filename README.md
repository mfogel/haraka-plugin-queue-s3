# haraka-plugin-queue-s3

[![build](https://github.com/mfogel/haraka-plugin-queue-s3/workflows/build/badge.svg)](https://github.com/mfogel/haraka-plugin-queue-s3/actions?query=workflow%3Abuild)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/haraka-plugin-queue-s3.svg)](https://www.npmjs.com/package/haraka-plugin-queue-s3)

A [Haraka](https://github.com/haraka/Haraka) plugin that stores messages in a S3 bucket.

Messages are stored in S3 using the [Haraka transaction uuid](https://haraka.github.io/manual/Transaction.html) as the key.

The following [custom S3 metadata headers](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata) are stored with the message in S3:

- `x-amz-meta-rcpts`: A comma-separated list of the recipient addresses for which Haraka accepted the message.
- `x-amz-meta-content-md5`: A MD5 hash of the message. Sometimes, but not always, redundant with the S3 ETag.

## Install

- add this plugin as a dependency of your haraka project (ie. using `npm` or `yarn`)
- add `queue-s3` to your haraka project's `config/plugins`

## Configure

There is one required configuration item which can be set by creating a one-line file in your haraka's `config` directory.

- `queue-s3.bucket-name`: The name of the S3 bucket table to store messages in.

AWS Credentials are assumed to be provided out-of-band (ie. via environment variables, IAM role attached to EC2 instance, etc)

## Changelog

### master

- Set content type of queued messages to `message/rfc822`

### v0.2

- Add `x-amz-meta-content-md5` S3 custom header

### v0.1

- initial release
