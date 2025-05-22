import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

interface CoderDatabaseProps {
  vpc: ec2.IVpc;
}

export class CoderDatabase extends Construct {
  public readonly parameterGroup: rds.IParameterGroup;
  public readonly cluster: rds.IDatabaseCluster;

  /**
   * Database for Coder (Aurora PostgreSQL)
   */
  constructor(scope: Construct, id: string, props: CoderDatabaseProps) {
    super(scope, id);

    const vpc = props.vpc;

    const instanceType = ec2.InstanceType.of(
      ec2.InstanceClass.T4G,
      ec2.InstanceSize.MEDIUM,
    );

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      version: rds.AuroraPostgresEngineVersion.VER_16_6,
    });

    this.parameterGroup = new rds.ParameterGroup(this, "ParameterGroup", {
      engine,
      parameters: {
        "rds.force_ssl": "0",
        "rds.logical_replication": "1",
      },
    });

    this.cluster = new rds.DatabaseCluster(this, "Cluster", {
      engine,
      parameterGroup: this.parameterGroup,
      writer: rds.ClusterInstance.provisioned("Instance1", { instanceType }),
      defaultDatabaseName: "coder",
      credentials: rds.Credentials.fromPassword(
        "postgres",
        cdk.SecretValue.unsafePlainText("postgres"),
      ),
      storageEncrypted: true,
      networkType: rds.NetworkType.DUAL,
      vpc,
    });
  }
}
