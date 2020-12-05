# haraka-plugin-queue-s3

[![build](https://github.com/mfogel/haraka-plugin-queue-s3/workflows/build/badge.svg)](https://github.com/mfogel/haraka-plugin-queue-s3/actions?query=workflow%3Abuild)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/haraka-plugin-queue-s3.svg)](https://www.npmjs.com/package/haraka-plugin-queue-s3)

A [Haraka](https://github.com/haraka/Haraka) plugin that stores messages in a s3 bucket.

The recipient addresses for which Haraka accepted the message are stored as a comma-seperated list in a [custom s3 object header](https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingMetadata.html#UserMetadata), `x-amz-meta-rcpts`.

Messages are stored in the S3 bucket using the [Haraka transaction uuid](https://haraka.github.io/manual/Transaction.html) as the key.

## Install

- add this plugin as a dependency of your haraka project (ie. using npm or yarn)
- add `queue-s3` to your haraka project's `config/plugins`

## Configure

There is one required configuration item which can be set by creating a one-line file in your haraka's `config` directory.

- `queue-s3.bucket-name`: The name of the s3 bucket table to store messages in.

AWS Credentials are assumed to be provided out-of-band (ie. via environment variables, IAM role attached to EC2 instance, etc)

## Changelog

### v0.1

- initial release
