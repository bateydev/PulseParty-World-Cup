#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PulsePartyStack } from '../lib/pulseparty-stack';

const app = new cdk.App();

new PulsePartyStack(app, 'PulsePartyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'PulseParty Rooms - Real-time social multiplayer fan experience platform',
});
