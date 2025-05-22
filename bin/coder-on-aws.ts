#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CoderStack } from "../lib/coder-stack";

const app = new cdk.App();

new CoderStack(app, "Coder", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "ap-northeast-1",
  },
});
