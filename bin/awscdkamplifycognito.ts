#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core'
import { AwscdkamplifycognitoStack } from '../lib/awscdkamplifycognito-stack';

const app = new cdk.App();
new AwscdkamplifycognitoStack(app, 'AwscdkamplifycognitoStack', {
   env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});